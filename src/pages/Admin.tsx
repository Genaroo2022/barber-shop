import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, CalendarDays, Users, BarChart3, DollarSign, LogOut, Menu, X, Images, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppointmentsTab from "@/components/admin/AppointmentsTab";
import ClientsTab from "@/components/admin/ClientsTab";
import StatsTab from "@/components/admin/StatsTab";
import IncomeTab from "@/components/admin/IncomeTab";
import ServicesTab from "@/components/admin/ServicesTab";
import GalleryTab from "@/components/admin/GalleryTab";
import { clearAccessToken, isAuthenticated } from "@/lib/auth";

const tabs = [
  { id: "appointments", label: "Turnos", icon: CalendarDays },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "stats", label: "Estadisticas", icon: BarChart3 },
  { id: "income", label: "Ingresos", icon: DollarSign },
  { id: "services", label: "Servicios", icon: Tag },
  { id: "gallery", label: "Galeria", icon: Images },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("appointments");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAccessToken();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            <span className="font-display font-bold gold-text">Admin</span>
          </div>
          <button className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Cerrar sesion
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border flex items-center px-6 gap-4">
          <button className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-semibold">{tabs.find((t) => t.id === activeTab)?.label}</h1>
        </header>

        <div className="p-6">
          {activeTab === "appointments" && <AppointmentsTab />}
          {activeTab === "clients" && <ClientsTab />}
          {activeTab === "stats" && <StatsTab />}
          {activeTab === "income" && <IncomeTab />}
          {activeTab === "services" && <ServicesTab />}
          {activeTab === "gallery" && <GalleryTab />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
