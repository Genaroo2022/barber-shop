import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, Chrome } from "lucide-react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loginWithFirebase } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { ADMIN_ROUTE } from "@/lib/routes";

const extractRejectedUid = (error: unknown): string | null => {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/UID:\s*([A-Za-z0-9_-]+)/i);
  return match?.[1] ?? null;
};

const Login = () => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const navigate = useNavigate();
  const backendLoginStartedRef = useRef(false);

  const mapFirebaseError = (error: unknown): string => {
    if (error instanceof Error) {
      if (error.message.startsWith("Usuario no encontrado")) return "Usuario no encontrado";
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") return "Se cancelo el inicio con Google";
      if (code === "auth/too-many-requests") return "Demasiados intentos. Espera un momento";
      return error.message || "No se pudo autenticar";
    }
    return "No se pudo autenticar";
  };

  const safeFirebaseSignOut = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // noop
    }
  };

  const showAuthError = (message: string) => {
    setAuthError(message);
    toast.error(message);
    console.error("[auth/login]", message);
  };

  const completeBackendLogin = async (firebaseUserOverride?: User | null) => {
    const firebaseUser = firebaseUserOverride ?? getFirebaseAuth().currentUser;
    if (!firebaseUser) {
      throw new Error("No se pudo obtener la sesion de Firebase");
    }

    const idToken = await firebaseUser.getIdToken(true);
    const response = await loginWithFirebase(idToken);
    setAccessToken(response.accessToken);
    setAuthError(null);
    navigate(ADMIN_ROUTE);
  };

  const completeBackendLoginOnce = async (firebaseUser?: User | null) => {
    if (backendLoginStartedRef.current) {
      return;
    }
    backendLoginStartedRef.current = true;
    try {
      setLoadingGoogle(true);
      await completeBackendLogin(firebaseUser);
      toast.success("Inicio de sesion exitoso");
    } catch (error) {
      const rejectedUid = extractRejectedUid(error) ?? getFirebaseAuth().currentUser?.uid;
      backendLoginStartedRef.current = false;
      await safeFirebaseSignOut();
      if (error instanceof Error && error.message.startsWith("Usuario no encontrado")) {
        showAuthError(rejectedUid ? `Usuario no encontrado. UID: ${rejectedUid}` : "Usuario no encontrado");
      } else {
        showAuthError(mapFirebaseError(error));
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        void completeBackendLoginOnce(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setLoadingGoogle(true);
      const auth = getFirebaseAuth();
      const result = await signInWithPopup(auth, getGoogleProvider());
      await completeBackendLoginOnce(result.user);
    } catch (error) {
      await safeFirebaseSignOut();
      showAuthError(mapFirebaseError(error));
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6">
      <div className="glass-card rounded-2xl p-6 sm:p-8 md:p-12 w-full max-w-md gold-border-glow">
        <div className="text-center mb-8">
          <Scissors className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold">Panel Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Acceso exclusivo para usuarios pre-registrados</p>
        </div>

        <div className="space-y-4">
          {authError ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {authError}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="w-full gold-gradient text-primary-foreground font-semibold py-5"
          >
            <Chrome className="w-4 h-4 mr-2" />
            {loadingGoogle ? "Abriendo Google..." : "Ingresar con Google"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
