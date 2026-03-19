import { motion } from "framer-motion";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(40_68%_62%_/_0.16),transparent_34%),linear-gradient(180deg,hsl(210_24%_15%)_0%,hsl(210_24%_11%)_45%,hsl(210_22%_9%)_100%)]" />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, hsl(40 65% 50% / 0.12) 0px, transparent 1px, transparent 40px, hsl(40 65% 50% / 0.12) 41px)`,
        }} />
      </div>

      {/* Radial glow */}
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[640px] w-[640px] rounded-full bg-primary/12 blur-[135px]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/6 to-transparent" />

      <div className="container relative z-10 px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="h-px w-12 bg-primary/50" />
          <Scissors className="w-5 h-5 text-primary" />
          <div className="h-px w-12 bg-primary/50" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight mb-6"
        >
          <span className="gold-text">Barber</span>
          <span className="text-foreground">Shop</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto mb-4"
        >
          Estilo profesional a domicilio. Tu mejor versión empieza aquí.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="text-primary/80 text-sm font-medium uppercase tracking-widest mb-10"
        >
          Servicio personalizado en la comodidad de tu zona
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4"
        >
          <a href="#booking">
            <Button
              size="lg"
              className="gold-gradient text-primary-foreground font-semibold px-8 sm:px-10 py-5 sm:py-6 text-base shadow-[0_10px_30px_hsl(40_65%_50%_/_0.28)] hover:opacity-95 transition-opacity"
            >
              Reservar turno
            </Button>
          </a>
          <a href="#services">
            <Button
              variant="outline"
              size="lg"
              className="border-primary/30 bg-background/35 text-foreground/90 hover:bg-primary/12 hover:text-primary hover:border-primary/45 px-7 py-5 text-sm font-medium backdrop-blur-sm"
            >
              Ver servicios
            </Button>
          </a>
          <a href="#gallery">
            <Button
              variant="outline"
              size="lg"
              className="border-primary/30 bg-background/35 text-foreground/90 hover:bg-primary/12 hover:text-primary hover:border-primary/45 px-7 py-5 text-sm font-medium backdrop-blur-sm"
            >
              Ver galeria
            </Button>
          </a>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
