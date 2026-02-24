import { useEffect, useMemo, useState } from "react";
import { CalendarDays, DollarSign, Scissors, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getAdminIncome, listAdminAppointments, type AppointmentItem, type ManualIncomeEntry } from "@/lib/api";
import { getCurrentMonthKey, isInMonth } from "@/lib/month";

const StatsTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualIncomeEntry[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [appointments, income] = await Promise.all([
          listAdminAppointments(selectedMonth),
          getAdminIncome(selectedMonth),
        ]);
        setAppointments(
          appointments.map((appointment) => ({
            ...appointment,
            servicePrice: Number(appointment.servicePrice) || 0,
          }))
        );
        setManualEntries(
          income.manualEntries.map((entry) => ({
            ...entry,
            amount: Number(entry.amount) || 0,
            tipAmount: Number(entry.tipAmount) || 0,
            total: Number(entry.total) || 0,
          }))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar estadísticas";
        toast.error(message);
      }
    };
    void fetchStats();
  }, [selectedMonth]);

  const filteredAppointments = useMemo(
    () => appointments.filter((appointment) => isInMonth(appointment.appointmentAt, selectedMonth)),
    [appointments, selectedMonth]
  );
  const filteredManualEntries = useMemo(
    () => manualEntries.filter((entry) => isInMonth(entry.occurredOn, selectedMonth)),
    [manualEntries, selectedMonth]
  );

  const monthlyIncome =
    filteredAppointments
      .filter((appointment) => appointment.status === "COMPLETED")
      .reduce((sum, appointment) => sum + appointment.servicePrice, 0) +
    filteredManualEntries.reduce((sum, entry) => sum + entry.amount + entry.tipAmount, 0);

  const cards = [
    { label: "Turnos del mes", value: filteredAppointments.length, icon: CalendarDays, color: "text-primary" },
    {
      label: "Completados",
      value: filteredAppointments.filter((a) => a.status === "COMPLETED").length,
      icon: Scissors,
      color: "text-green-500",
    },
    {
      label: "Cancelados",
      value: filteredAppointments.filter((a) => a.status === "CANCELLED").length,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      label: "Ingreso mensual",
      value: `$${monthlyIncome.toLocaleString("es-AR")}`,
      icon: DollarSign,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="grid md:grid-cols-[200px_1fr] gap-3 items-center">
          <p className="text-sm text-muted-foreground">Mes a consultar</p>
          <Input
            id="stats-month"
            name="stats-month"
            aria-label="Mes a consultar"
            type="month"
            autoComplete="off"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-sm text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-2xl sm:text-3xl font-display font-bold break-words">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsTab;
