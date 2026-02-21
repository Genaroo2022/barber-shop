import { useEffect, useState } from "react";
import { CalendarDays, DollarSign, Scissors, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getAdminIncome, listAdminAppointments } from "@/lib/api";

const StatsTab = () => {
  const [stats, setStats] = useState({
    monthlyAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    monthlyIncome: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [appointments, income] = await Promise.all([listAdminAppointments(), getAdminIncome()]);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthlyAppointments = appointments.filter((appointment) => {
          const date = new Date(appointment.appointmentAt);
          return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        });

        setStats({
          monthlyAppointments: monthlyAppointments.length,
          completedAppointments: appointments.filter((a) => a.status === "COMPLETED").length,
          cancelledAppointments: appointments.filter((a) => a.status === "CANCELLED").length,
          monthlyIncome: Number(income.monthlyIncome) || 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar estadisticas";
        toast.error(message);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Turnos del mes", value: stats.monthlyAppointments, icon: CalendarDays, color: "text-primary" },
    { label: "Completados", value: stats.completedAppointments, icon: Scissors, color: "text-green-500" },
    { label: "Cancelados", value: stats.cancelledAppointments, icon: XCircle, color: "text-red-500" },
    {
      label: "Ingreso mensual",
      value: `$${stats.monthlyIncome.toLocaleString("es-AR")}`,
      icon: DollarSign,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-sm text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-3xl font-display font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsTab;
