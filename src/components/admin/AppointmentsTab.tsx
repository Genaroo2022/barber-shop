import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminAppointments, updateAdminAppointmentStatus, type AppointmentItem } from "@/lib/api";
import { clearAccessToken } from "@/lib/auth";

const statusColors: Record<AppointmentItem["status"], string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  CONFIRMED: "bg-green-500/10 text-green-500 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  COMPLETED: "bg-primary/10 text-primary border-primary/20",
};

const statusLabels: Record<AppointmentItem["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Completado",
};

const AppointmentsTab = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const data = await listAdminAppointments();
      setAppointments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar turnos";
      toast.error(message);
      if (message.toLowerCase().includes("autentic")) {
        clearAccessToken();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateStatus = async (id: string, status: AppointmentItem["status"]) => {
    try {
      await updateAdminAppointmentStatus(id, status);
      toast.success("Estado actualizado");
      fetchAppointments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar";
      toast.error(message);
    }
  };

  if (loading) return <div className="text-muted-foreground">Cargando turnos...</div>;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Cliente</TableHead>
            <TableHead className="text-muted-foreground">Servicio</TableHead>
            <TableHead className="text-muted-foreground">Fecha</TableHead>
            <TableHead className="text-muted-foreground">Hora</TableHead>
            <TableHead className="text-muted-foreground">Estado</TableHead>
            <TableHead className="text-muted-foreground">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                No hay turnos registrados
              </TableCell>
            </TableRow>
          ) : (
            appointments.map((apt) => {
              const date = new Date(apt.appointmentAt);
              return (
                <TableRow key={apt.id} className="border-border">
                  <TableCell>
                    <div>
                      <p className="font-medium">{apt.clientName}</p>
                      <p className="text-xs text-muted-foreground">{apt.clientPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{apt.serviceName}</TableCell>
                  <TableCell className="text-sm">{format(date, "d MMM yyyy", { locale: es })}</TableCell>
                  <TableCell className="text-sm">{format(date, "HH:mm")}hs</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[apt.status]}>
                      {statusLabels[apt.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {apt.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                            onClick={() => updateStatus(apt.id, "CONFIRMED")}
                            title="Confirmar"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                            onClick={() => updateStatus(apt.id, "CANCELLED")}
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {apt.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                          onClick={() => updateStatus(apt.id, "COMPLETED")}
                          title="Completar"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AppointmentsTab;
