import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";

const galleryItems = [
  { title: "Fade Clásico", category: "Corte" },
  { title: "Pompadour Moderno", category: "Corte" },
  { title: "Barba Definida", category: "Barba" },
  { title: "Undercut", category: "Corte" },
  { title: "Degradé + Diseño", category: "Corte" },
  { title: "Barba Full", category: "Barba" },
];

const Gallery = () => {
  return (
    <section id="gallery" className="py-24 relative">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">Galería</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Nuestros <span className="gold-text">Trabajos</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {galleryItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="aspect-square glass-card rounded-xl overflow-hidden group cursor-pointer relative"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary/50">
                <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                <span className="text-muted-foreground/50 text-xs">Foto próximamente</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <div>
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">{item.category}</p>
                  <p className="font-display font-semibold">{item.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-muted-foreground text-sm mt-8">
          Próximamente fotos reales de nuestros trabajos
        </p>
      </div>
    </section>
  );
};

export default Gallery;
