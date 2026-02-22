import { Scissors, Instagram, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const Navbar = () => {
  const handleAiClick = () => {
    const section = document.getElementById("ai");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    toast("IA en camino: pronto vas a poder gestionar turnos con asistencia inteligente.");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          <span className="font-display text-lg font-bold gold-text">Barber Shop</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#services" className="text-sm text-muted-foreground hover:text-primary transition-colors">Servicios</a>
          <a href="#gallery" className="text-sm text-muted-foreground hover:text-primary transition-colors">Galería</a>
          <a href="#booking" className="text-sm text-muted-foreground hover:text-primary transition-colors">Turnos</a>
        </div>

        <button
          type="button"
          onClick={handleAiClick}
          className="text-sm font-semibold px-5 py-2 rounded-lg border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          title="Funcionalidad en desarrollo"
        >
          IA (Proximamente)
        </button>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-display font-bold gold-text">Barber Shop</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> Consultá horarios</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Atención a domicilio</span>
          </div>
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Barber Shop. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Navbar, Footer };

