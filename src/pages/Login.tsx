import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      setAccessToken(result.accessToken);
      navigate("/admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al iniciar sesion";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass-card rounded-2xl p-8 md:p-12 w-full max-w-md gold-border-glow">
        <div className="text-center mb-8">
          <Scissors className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold">Panel Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Acceso exclusivo para el barbero</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground/80">Email</Label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary/50 border-border/50 focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground/80">Contrasena</Label>
            <Input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/50 border-border/50 focus:border-primary"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full gold-gradient text-primary-foreground font-semibold py-5"
          >
            <Lock className="w-4 h-4 mr-2" />
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
