import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, Smartphone, Chrome } from "lucide-react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithFirebase } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { ADMIN_ROUTE } from "@/lib/routes";

const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;
const normalizePhoneForFirebase = (value: string): string => value.replace(/[^\d+]/g, "");
const PHONE_PREFIX = "+54 9 11";
const formatLocalPhone = (digits: string): string =>
  digits.length <= 4 ? digits : `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;

const Login = () => {
  const [localPhoneDigits, setLocalPhoneDigits] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const navigate = useNavigate();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, []);

  const mapFirebaseError = (error: unknown): string => {
    if (error instanceof Error) {
      if (error.message === "Usuario no encontrado") return error.message;
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user") return "Se cancelo el inicio con Google";
      if (code === "auth/invalid-phone-number") return "Numero invalido. Usa formato internacional, por ejemplo +54911...";
      if (code === "auth/invalid-verification-code") return "Codigo incorrecto. Revisa e intenta de nuevo";
      if (code === "auth/code-expired") return "El codigo expiro. Solicita uno nuevo";
      if (code === "auth/too-many-requests") return "Demasiados intentos. Espera un momento";
      if (code === "auth/captcha-check-failed") return "No se pudo validar reCAPTCHA. Intenta nuevamente";
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

  const completeBackendLogin = async () => {
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error("No se pudo obtener la sesion de Firebase");
    }

    const idToken = await firebaseUser.getIdToken(true);
    const response = await loginWithFirebase(idToken);
    setAccessToken(response.accessToken);
    navigate(ADMIN_ROUTE);
  };

  const ensureRecaptchaVerifier = (): RecaptchaVerifier => {
    const auth = getFirebaseAuth();
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "firebase-recaptcha", {
        size: "invisible",
      });
    }
    return recaptchaRef.current;
  };

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true);
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, getGoogleProvider());
      await completeBackendLogin();
      toast.success("Inicio de sesion exitoso");
    } catch (error) {
      await safeFirebaseSignOut();
      toast.error(mapFirebaseError(error));
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedPhone = normalizePhoneForFirebase(`${PHONE_PREFIX}${localPhoneDigits}`);
    if (!PHONE_E164_REGEX.test(normalizedPhone)) {
      toast.error("Numero invalido. Usa formato internacional, por ejemplo +54 9 11 1234 5678");
      return;
    }

    try {
      setLoadingPhone(true);
      const verifier = ensureRecaptchaVerifier();
      const result = await signInWithPhoneNumber(getFirebaseAuth(), normalizedPhone, verifier);
      setConfirmationResult(result);
      toast.success("Codigo enviado por SMS");
    } catch (error) {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      toast.error(mapFirebaseError(error));
    } finally {
      setLoadingPhone(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmationResult) return;
    const normalizedCode = otpCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      toast.error("Ingresa un codigo de 6 digitos");
      return;
    }

    try {
      setVerifyingCode(true);
      await confirmationResult.confirm(normalizedCode);
      await completeBackendLogin();
      toast.success("Inicio de sesion exitoso");
    } catch (error) {
      await safeFirebaseSignOut();
      toast.error(mapFirebaseError(error));
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass-card rounded-2xl p-8 md:p-12 w-full max-w-md gold-border-glow">
        <div className="text-center mb-8">
          <Scissors className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold">Panel Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Acceso exclusivo para usuarios pre-registrados</p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loadingPhone || verifyingCode}
            className="w-full gold-gradient text-primary-foreground font-semibold py-5"
          >
            <Chrome className="w-4 h-4 mr-2" />
            {loadingGoogle ? "Conectando..." : "Ingresar con Google"}
          </Button>

          <div className="relative py-2">
            <div className="border-t border-border/70" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 bg-card px-2 text-xs text-muted-foreground">o</span>
          </div>

          {!confirmationResult ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div className="space-y-2">
                <Label className="text-foreground/80">Telefono</Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
                    <span className="inline-flex h-7 items-center rounded-md border border-primary/40 bg-secondary/80 px-2 text-xs font-semibold text-primary whitespace-nowrap leading-none">
                      {PHONE_PREFIX}
                    </span>
                  </div>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="1234 5678"
                    value={formatLocalPhone(localPhoneDigits)}
                    onChange={(e) => setLocalPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="bg-secondary/80 text-foreground placeholder:text-muted-foreground border-primary/30 focus:border-primary pl-28"
                    style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Ejemplo: +54 9 11 1234 5678</p>
              </div>
              <Button
                type="submit"
                disabled={loadingGoogle || loadingPhone || verifyingCode}
                variant="outline"
                className="w-full border-primary/40 bg-background/40 text-primary hover:bg-primary/15 hover:text-primary hover:border-primary/60"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                {loadingPhone ? "Enviando..." : "Enviar código SMS"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div className="space-y-2">
                <Label className="text-foreground/80">Codigo de verificacion</Label>
                <Input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="bg-white text-black placeholder:text-gray-500 border-gray-300 focus:border-primary tracking-[0.35em] text-center"
                />
              </div>
              <Button
                type="submit"
                disabled={loadingGoogle || loadingPhone || verifyingCode}
                className="w-full gold-gradient text-primary-foreground font-semibold py-5"
              >
                {verifyingCode ? "Verificando..." : "Verificar codigo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setConfirmationResult(null);
                  setOtpCode("");
                }}
                disabled={verifyingCode}
              >
                Cambiar numero
              </Button>
            </form>
          )}
        </div>
      </div>
      <div id="firebase-recaptcha" />
    </div>
  );
};

export default Login;
