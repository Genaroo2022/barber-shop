import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPublicAppointment, listPublicServices, type ServiceItem } from "@/lib/api";

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
];

const BookingForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await listPublicServices();
        setServices(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudieron cargar los servicios";
        toast.error(message);
      }
    };
    fetchServices();
  }, []);

  const selectedServiceName = useMemo(
    () => services.find((s) => s.id === serviceId)?.name || "",
    [services, serviceId]
  );

  const getBookingErrorMessage = (err: unknown): string => {
    const fallback = "Error al reservar";
    if (!(err instanceof Error)) return fallback;

    const normalized = err.message.toLowerCase();
    if (normalized.includes("ya existe un turno para ese servicio en esa fecha/hora")) {
      return "Ese horario ya fue tomado para el servicio seleccionado. Elegi otro horario para evitar doble reserva.";
    }

    return err.message || fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !serviceId || !date || !time) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const datePart = format(date, "yyyy-MM-dd");
      const appointmentAt = new Date(`${datePart}T${time}:00`).toISOString();
      await createPublicAppointment({
        clientName: name,
        clientPhone: phone,
        serviceId,
        appointmentAt,
      });
      setSubmitted(true);
      toast.success("Turno reservado con exito");
    } catch (err) {
      toast.error(getBookingErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="booking" className="py-24">
        <div className="container px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-12 max-w-lg mx-auto text-center gold-border-glow"
          >
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
            <h3 className="text-2xl font-display font-bold mb-3">Turno confirmado</h3>
            <p className="text-muted-foreground mb-2">
              {name}, tu turno para <span className="text-primary">{selectedServiceName}</span> esta agendado.
            </p>
            <p className="text-muted-foreground">
              {date && format(date, "EEEE d 'de' MMMM", { locale: es })} a las {time}hs
            </p>
            <Button
              className="mt-8 gold-gradient text-primary-foreground"
              onClick={() => {
                setSubmitted(false);
                setName("");
                setPhone("");
                setServiceId("");
                setDate(undefined);
                setTime("");
              }}
            >
              Reservar otro turno
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="booking" className="py-24">
      <div className="container px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">Reserva tu turno</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Agenda <span className="gold-text">Ahora</span>
          </h2>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-8 md:p-12 max-w-lg mx-auto space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground/80">
              Nombre completo
            </Label>
            <Input
              id="name"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary/50 border-border/50 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground/80">
              Telefono
            </Label>
            <Input
              id="phone"
              placeholder="Tu numero de telefono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-secondary/50 border-border/50 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Elige un servicio" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - ${Number(service.price).toLocaleString("es-AR")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left bg-secondary/50 border-border/50 hover:bg-secondary"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date() || d.getDay() === 0}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Horario</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Elige un horario" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}hs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gold-gradient text-primary-foreground font-semibold py-6 text-base hover:opacity-90 transition-opacity"
          >
            {loading ? "Reservando..." : "Confirmar turno"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
};

export default BookingForm;
