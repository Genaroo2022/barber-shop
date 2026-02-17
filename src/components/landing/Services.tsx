import { motion } from "framer-motion";
import { Scissors, SparkleIcon } from "lucide-react";

const services = [
  {
    name: "Corte de Cabello",
    description: "Corte profesional adaptado a tu estilo y tipo de rostro",
    price: "$5.000",
    icon: Scissors,
  },
  {
    name: "Perfilado de Barba",
    description: "Diseño y perfilado de barba con navaja y máquina",
    price: "$3.000",
    icon: SparkleIcon,
  },
  {
    name: "Corte + Barba",
    description: "El combo completo para lucir impecable de pies a cabeza",
    price: "$7.000",
    icon: Scissors,
    featured: true,
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">Nuestros Servicios</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Precios <span className="gold-text">Transparentes</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`glass-card rounded-xl p-8 text-center relative group hover:border-primary/30 transition-colors ${
                service.featured ? "gold-border-glow border-primary/20" : ""
              }`}
            >
              {service.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full">
                  POPULAR
                </div>
              )}
              <service.icon className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">{service.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{service.description}</p>
              <p className="text-3xl font-display font-bold gold-text">{service.price}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
