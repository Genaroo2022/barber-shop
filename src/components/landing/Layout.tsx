import { Scissors, Phone, MapPin } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          <span className="font-display text-base sm:text-lg font-bold gold-text">Barber Shop</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#services" className="text-sm text-muted-foreground hover:text-primary transition-colors">Servicios</a>
          <a href="#gallery" className="text-sm text-muted-foreground hover:text-primary transition-colors">Galeria</a>
          <a href="#booking" className="text-sm text-muted-foreground hover:text-primary transition-colors">Turnos</a>
        </div>

        <a
          href="#booking"
          className="text-xs sm:text-sm font-semibold px-3 sm:px-5 h-11 inline-flex items-center rounded-lg border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          title="Reserva tu turno"
        >
          RESERVAR
        </a>
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
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> Consulta horarios</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Atencion a domicilio</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Copyright {new Date().getFullYear()} Barber Shop. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Navbar, Footer };
