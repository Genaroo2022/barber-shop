import { useEffect, useState } from "react";
import { CalendarDays, Users, TrendingUp, Scissors } from "lucide-react";
import { toast } from "sonner";
import { getAdminOverview } from "@/lib/api";

const StatsTab = () => {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    uniqueClients: 0,
    popularService: "-",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminOverview();
        setStats(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar estadisticas";
        toast.error(message);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Turnos", value: stats.totalAppointments, icon: CalendarDays, color: "text-primary" },
    { label: "Pendientes", value: stats.pendingAppointments, icon: TrendingUp, color: "text-yellow-500" },
    { label: "Completados", value: stats.completedAppointments, icon: Scissors, color: "text-green-500" },
    { label: "Clientes Unicos", value: stats.uniqueClients, icon: Users, color: "text-blue-400" },
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

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold mb-2">Servicio mas popular</h3>
        <p className="text-2xl font-display font-bold gold-text">{stats.popularService}</p>
      </div>
    </div>
  );
};

export default StatsTab;
