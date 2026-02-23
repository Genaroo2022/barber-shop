import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, CheckCircle2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  createPublicAppointment,
  listPublicOccupiedAppointments,
  listPublicServices,
  type ServiceItem,
} from "@/lib/api";

const timeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
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

type FormErrors = {
  name?: string;
  phone?: string;
  serviceId?: string;
  date?: string;
  time?: string;
};

type FetchOccupiedSlotsOptions = {
  showLoadingIndicator?: boolean;
  minLoadingMs?: number;
};

const phoneHasValidLength = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
};

const phoneHasValidCharacters = (phone: string): boolean =>
  /^[0-9+()\-\s]+$/.test(phone);

const sanitizePhoneDigits = (value: string): string => value.replace(/\D/g, "");

const getPhoneValidationMessage = (rawPhone: string): string | null => {
  const phone = rawPhone.trim();
  if (!phone) return "Completá tu teléfono";
  if (!phoneHasValidCharacters(phone)) return "Teléfono inválido (solo números, +, (), -, espacios)";
  if (!phoneHasValidLength(phone)) return "Teléfono inválido (entre 8 y 15 dígitos)";
  return null;
};

const BookingForm = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [loadingOccupiedSlots, setLoadingOccupiedSlots] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [redirectCancelled, setRedirectCancelled] = useState(false);
  const whatsappBusinessPhone = sanitizePhoneDigits(import.meta.env.VITE_WHATSAPP_BOOKING_PHONE || "");

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
    void fetchServices();
  }, []);

  const selectedServiceName = useMemo(
    () => services.find((s) => s.id === serviceId)?.name || "",
    [services, serviceId]
  );

  const selectedDateKey = useMemo(() => (date ? format(date, "yyyy-MM-dd") : ""), [date]);
  const selectedDateLabel = useMemo(
    () => (date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : ""),
    [date]
  );

  const availableTimeSlots = useMemo(
    () => timeSlots.filter((slot) => !occupiedSlots.has(slot)),
    [occupiedSlots]
  );

  const whatsappHref = useMemo(() => {
    if (!whatsappBusinessPhone || !submitted || !selectedServiceName || !selectedDateLabel || !time) return "";

    const messageLines = [
      "¡Hola! Ya reservé mi turno desde la web y quiero confirmarlo por WhatsApp.",
      `Nombre: ${name.trim()}`,
      `Servicio: ${selectedServiceName}`,
      `Fecha: ${selectedDateLabel}`,
      `Horario: ${time}hs`,
      `Teléfono: ${phone.trim()}`,
    ];

    const encodedMessage = encodeURIComponent(messageLines.join("\n"));
    return `https://wa.me/${whatsappBusinessPhone}?text=${encodedMessage}`;
  }, [whatsappBusinessPhone, submitted, selectedServiceName, selectedDateLabel, time, name, phone]);

  const openWhatsappConversation = useCallback(() => {
    if (!whatsappHref || typeof window === "undefined") return;
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }, [whatsappHref]);

  useEffect(() => {
    if (!submitted || !whatsappHref || redirectCancelled) {
      setRedirectCountdown(null);
      return;
    }

    setRedirectCountdown(5);
    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(interval);
          openWhatsappConversation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [submitted, whatsappHref, redirectCancelled, openWhatsappConversation]);

  const getBookingErrorMessage = (err: unknown): string => {
    const fallback = "Error al reservar";
    if (!(err instanceof Error)) return fallback;

    const normalized = err.message.toLowerCase();
    if (normalized.includes("ya existe un turno para ese servicio en esa fecha/hora")) {
      return "Ese horario ya fue tomado para el servicio seleccionado. Elegí otro horario para evitar doble reserva.";
    }
    if (normalized.includes("demasiadas reservas")) {
      return err.message;
    }

    return err.message || fallback;
  };

  const fetchOccupiedSlots = useCallback(
    async (
      selectedServiceId: string,
      selectedDate: string,
      options: FetchOccupiedSlotsOptions = {}
    ) => {
      const { showLoadingIndicator = false, minLoadingMs = 700 } = options;
      const startedAt = Date.now();

      if (showLoadingIndicator) {
        setLoadingOccupiedSlots(true);
      }

      try {
        const occupied = await listPublicOccupiedAppointments(selectedServiceId, selectedDate);
        const next = new Set(occupied.map((item) => format(new Date(item.appointmentAt), "HH:mm")));
        setOccupiedSlots(next);
        if (!submitted && time && next.has(time)) {
          setTime("");
        }
      } finally {
        if (showLoadingIndicator) {
          const elapsed = Date.now() - startedAt;
          if (elapsed < minLoadingMs) {
            await new Promise((resolve) => setTimeout(resolve, minLoadingMs - elapsed));
          }
          setLoadingOccupiedSlots(false);
        }
      }
    },
    [submitted, time]
  );

  const markCurrentSlotAsOccupied = (slot: string) => {
    setOccupiedSlots((prev) => {
      const next = new Set(prev);
      next.add(slot);
      return next;
    });
  };

  useEffect(() => {
    if (submitted) {
      return;
    }

    if (!serviceId || !selectedDateKey) {
      setOccupiedSlots(new Set());
      setLoadingOccupiedSlots(false);
      setTime("");
      return;
    }

    const load = async () => {
      try {
        await fetchOccupiedSlots(serviceId, selectedDateKey, { showLoadingIndicator: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudieron actualizar los horarios";
        toast.error(message);
      }
    };

    void load();
    const interval = setInterval(() => {
      void fetchOccupiedSlots(serviceId, selectedDateKey).catch(() => {
        // ignore background refresh failures to avoid noisy UI
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOccupiedSlots, serviceId, selectedDateKey, submitted]);

  const refreshOccupiedSlotsIfReady = useCallback(() => {
    if (!serviceId || !selectedDateKey) return;
    void fetchOccupiedSlots(serviceId, selectedDateKey, { showLoadingIndicator: true }).catch(() => {
      // ignore manual refresh failures while opening the selector
    });
  }, [fetchOccupiedSlots, serviceId, selectedDateKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FormErrors = {};
    if (!name.trim()) errors.name = "Completa tu nombre";
    const phoneError = getPhoneValidationMessage(phone);
    if (phoneError) errors.phone = phoneError;
    if (!serviceId) errors.serviceId = "Selecciona un servicio";
    if (!date) errors.date = "Selecciona una fecha";
    if (!time) errors.time = "Selecciona un horario";

    if (errors.name || errors.phone || errors.serviceId || errors.date || errors.time) {
      setFieldErrors(errors);
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setFieldErrors({});
    try {
      const datePart = format(date as Date, "yyyy-MM-dd");
      const appointmentAt = new Date(`${datePart}T${time}:00`).toISOString();
      await createPublicAppointment({
        clientName: name.trim(),
        clientPhone: phone.trim(),
        serviceId,
        appointmentAt,
      });
      markCurrentSlotAsOccupied(time);
      setRedirectCancelled(false);
      setRedirectCountdown(null);
      setSubmitted(true);
      toast.success("Turno reservado con éxito");
    } catch (err) {
      toast.error(getBookingErrorMessage(err));
      if (serviceId && selectedDateKey) {
        try {
          await fetchOccupiedSlots(serviceId, selectedDateKey);
        } catch {
          // ignore secondary refresh failure
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const errorClass = (hasError: boolean) =>
    hasError ? "border-destructive focus-visible:ring-destructive" : "";

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
              {name}, tu turno para <span className="text-primary">{selectedServiceName}</span> está agendado.
            </p>
            <p className="text-muted-foreground">
              {selectedDateLabel} a las {time}hs
            </p>
            {whatsappHref ? (
              <>
                <p className="text-muted-foreground mt-4">
                  Tu turno quedó registrado correctamente.
                </p>
                <p className="text-muted-foreground">
                  En unos segundos te vamos a redirigir a WhatsApp para enviar la confirmación al barbero.
                </p>
                {redirectCountdown !== null && (
                  <p className="text-primary font-semibold mt-2">
                    Redireccionando en {redirectCountdown} segundos...
                  </p>
                )}
                <Button asChild className="mt-6 w-full gold-gradient text-primary-foreground">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ir ahora a WhatsApp
                  </a>
                </Button>
              </>
            ) : null}
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                setSubmitted(false);
                setName("");
                setPhone("");
                setServiceId("");
                setDate(undefined);
                setTime("");
                setOccupiedSlots(new Set());
                setFieldErrors({});
                setRedirectCancelled(false);
                setRedirectCountdown(null);
              }}
            >
              Volver al Inicio
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24">
      <div className="container px-6">
        <motion.div
          id="booking"
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
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={`bg-secondary/50 border-border/50 focus:border-primary ${errorClass(Boolean(fieldErrors.name))}`}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground/80">
              Teléfono
            </Label>
            <Input
              id="phone"
              placeholder="Tu número de teléfono"
              value={phone}
              onChange={(e) => {
                const value = e.target.value;
                setPhone(value);
                setFieldErrors((prev) => {
                  if (!prev.phone) return prev;
                  return { ...prev, phone: getPhoneValidationMessage(value) ?? undefined };
                });
              }}
              className={`bg-secondary/50 border-border/50 focus:border-primary ${errorClass(Boolean(fieldErrors.phone))}`}
            />
            {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Servicio</Label>
            <Select
              value={serviceId}
              onValueChange={(value) => {
                setServiceId(value);
                setFieldErrors((prev) => ({ ...prev, serviceId: undefined, time: undefined }));
                setTime("");
              }}
            >
              <SelectTrigger
                className={`bg-secondary/50 border-border/50 ${fieldErrors.serviceId ? "border-destructive ring-destructive" : ""}`}
              >
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
            {fieldErrors.serviceId && <p className="text-xs text-destructive">{fieldErrors.serviceId}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left bg-secondary/50 border-border/50 hover:bg-secondary ${errorClass(Boolean(fieldErrors.date))}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selected) => {
                    setDate(selected);
                    setFieldErrors((prev) => ({ ...prev, date: undefined, time: undefined }));
                    setTime("");
                  }}
                  disabled={(d) => d < new Date() || d.getDay() === 0}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground/80">Horario</Label>
            <Select
              value={time}
              disabled={!serviceId || !date || loadingOccupiedSlots}
              onValueChange={(value) => {
                setTime(value);
                setFieldErrors((prev) => ({ ...prev, time: undefined }));
              }}
            >
              <SelectTrigger
                onClick={refreshOccupiedSlotsIfReady}
                className={`bg-secondary/50 border-border/50 ${fieldErrors.time ? "border-destructive ring-destructive" : ""}`}
              >
                <SelectValue
                  placeholder={
                    !serviceId || !date
                      ? "Primero seleccioná servicio y fecha"
                      : loadingOccupiedSlots
                        ? "Actualizando horarios..."
                        : "Elegí un horario"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {availableTimeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}hs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableTimeSlots.length === 0 && date && serviceId && (
              <p className="text-xs text-muted-foreground">No hay horarios disponibles para esa fecha.</p>
            )}
            {fieldErrors.time && <p className="text-xs text-destructive">{fieldErrors.time}</p>}
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
