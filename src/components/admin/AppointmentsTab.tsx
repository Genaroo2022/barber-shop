import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteAdminAppointment,
  listAdminAppointments,
  listAdminServices,
  updateAdminAppointment,
  updateAdminAppointmentStatus,
  type AppointmentItem,
  type ServiceItem,
} from "@/lib/api";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { clearAccessToken } from "@/lib/auth";
import { getCurrentMonthKey, isInMonth, monthKeyForFilename } from "@/lib/month";

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

type EditForm = {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  appointmentAt: string;
  status: AppointmentItem["status"];
  notes: string;
};

type EditFormErrors = {
  clientName?: string;
  clientPhone?: string;
  serviceId?: string;
  appointmentAt?: string;
  status?: string;
};

const emptyEditForm: EditForm = {
  clientName: "",
  clientPhone: "",
  serviceId: "",
  appointmentAt: "",
  status: "PENDING",
  notes: "",
};

const toDateTimeLocal = (iso: string): string => {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const AppointmentsTab = () => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [editingAppointment, setEditingAppointment] = useState<AppointmentItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<AppointmentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const knownAppointmentIdsRef = useRef<Set<string> | null>(null);

  const fetchAppointments = async (options?: { notifyNew?: boolean; silent?: boolean }) => {
    try {
      const [appointmentsData, servicesData] = await Promise.all([listAdminAppointments(), listAdminServices()]);
      setAppointments(appointmentsData);
      setServices(servicesData);

      const nextIds = new Set(appointmentsData.map((appointment) => appointment.id));
      const knownIds = knownAppointmentIdsRef.current;
      if (options?.notifyNew && knownIds) {
        let newCount = 0;
        nextIds.forEach((id) => {
          if (!knownIds.has(id)) {
            newCount += 1;
          }
        });
        if (newCount > 0) {
          toast.success(newCount === 1 ? "Nuevo turno agendado" : `${newCount} nuevos turnos agendados`);
        }
      }
      knownAppointmentIdsRef.current = nextIds;
    } catch (err) {
      if (!options?.silent) {
        const message = err instanceof Error ? err.message : "Error al cargar turnos";
        toast.error(message);
        if (message.toLowerCase().includes("autentic")) {
          clearAccessToken();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAppointments();
    const interval = setInterval(() => {
      void fetchAppointments({ notifyNew: true, silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredAppointments = useMemo(
    () => appointments.filter((appointment) => isInMonth(appointment.appointmentAt, selectedMonth)),
    [appointments, selectedMonth]
  );

  const activeServices = useMemo(() => services.filter((service) => service.active), [services]);

  const updateStatus = async (id: string, status: AppointmentItem["status"]) => {
    try {
      await updateAdminAppointmentStatus(id, status);
      toast.success("Estado actualizado");
      await fetchAppointments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar";
      toast.error(message);
    }
  };

  const startEdit = (appointment: AppointmentItem) => {
    setEditingAppointment(appointment);
    setEditErrors({});
    setEditForm({
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      serviceId: appointment.serviceId,
      appointmentAt: toDateTimeLocal(appointment.appointmentAt),
      status: appointment.status,
      notes: appointment.notes ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;
    const errors: EditFormErrors = {};
    if (!editForm.clientName.trim()) errors.clientName = "Completa el nombre";
    if (!editForm.clientPhone.trim()) errors.clientPhone = "Completa el telefono";
    if (!editForm.serviceId) errors.serviceId = "Selecciona servicio";
    if (!editForm.appointmentAt) errors.appointmentAt = "Completa fecha y hora";
    if (!editForm.status) errors.status = "Selecciona estado";
    if (errors.clientName || errors.clientPhone || errors.serviceId || errors.appointmentAt || errors.status) {
      setEditErrors(errors);
      toast.error("Completa los campos obligatorios");
      return;
    }

    try {
      setSavingEdit(true);
      setEditErrors({});
      const appointmentAtIso = new Date(editForm.appointmentAt).toISOString();
      await updateAdminAppointment(editingAppointment.id, {
        clientName: editForm.clientName.trim(),
        clientPhone: editForm.clientPhone.trim(),
        serviceId: editForm.serviceId,
        appointmentAt: appointmentAtIso,
        notes: editForm.notes.trim() || undefined,
      });
      if (editForm.status !== editingAppointment.status) {
        await updateAdminAppointmentStatus(editingAppointment.id, editForm.status);
      }
      toast.success("Turno actualizado");
      setEditingAppointment(null);
      setEditForm(emptyEditForm);
      await fetchAppointments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo editar el turno";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAdminAppointment(deleteTarget.id);
      toast.success("Turno eliminado");
      setDeleteTarget(null);
      await fetchAppointments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el turno";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const exportAppointmentsCsv = () => {
    if (filteredAppointments.length === 0) {
      toast.error("No hay turnos para exportar en ese mes");
      return;
    }

    const csv = buildCsv(
      ["Cliente", "Telefono", "Servicio", "Fecha", "Hora", "Estado", "Notas"],
      filteredAppointments.map((apt) => {
        const date = new Date(apt.appointmentAt);
        return [
          apt.clientName,
          apt.clientPhone,
          apt.serviceName,
          format(date, "yyyy-MM-dd"),
          format(date, "HH:mm"),
          statusLabels[apt.status],
          apt.notes ?? "",
        ];
      })
    );

    downloadCsv(`turnos_${monthKeyForFilename(selectedMonth)}.csv`, csv);
    toast.success("CSV de turnos descargado");
  };

  if (loading) return <div className="text-muted-foreground">Cargando turnos...</div>;
  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="grid md:grid-cols-[200px_1fr] gap-3 items-center">
          <p className="text-sm text-muted-foreground">Mes a consultar</p>
          <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportAppointmentsCsv}>
          <Download className="w-4 h-4 mr-2" />
          Descargar
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground">Servicio</TableHead>
              <TableHead className="text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-muted-foreground">Hora</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground">Notas</TableHead>
              <TableHead className="text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No hay turnos registrados para ese mes
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((apt) => {
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
                    <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate" title={apt.notes ?? ""}>
                      {apt.notes?.trim() ? apt.notes : "-"}
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => startEdit(apt)}
                          title="Editar turno"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                          onClick={() => setDeleteTarget(apt)}
                          title="Eliminar turno"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(editingAppointment)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAppointment(null);
            setEditForm(emptyEditForm);
            setEditErrors({});
          }
        }}
      >
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Editar turno</AlertDialogTitle>
            <AlertDialogDescription>
              Modifica cliente, servicio, fecha/hora o notas del turno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Nombre del cliente"
              value={editForm.clientName}
              onChange={(e) => {
                setEditForm((prev) => ({ ...prev, clientName: e.target.value }));
                setEditErrors((prev) => ({ ...prev, clientName: undefined }));
              }}
              className={errorClass(Boolean(editErrors.clientName))}
            />
            {editErrors.clientName && <p className="text-xs text-destructive">{editErrors.clientName}</p>}
            <Input
              placeholder="Telefono"
              value={editForm.clientPhone}
              onChange={(e) => {
                setEditForm((prev) => ({ ...prev, clientPhone: e.target.value }));
                setEditErrors((prev) => ({ ...prev, clientPhone: undefined }));
              }}
              className={errorClass(Boolean(editErrors.clientPhone))}
            />
            {editErrors.clientPhone && <p className="text-xs text-destructive">{editErrors.clientPhone}</p>}
            <select
              value={editForm.serviceId}
              onChange={(e) => {
                setEditForm((prev) => ({ ...prev, serviceId: e.target.value }));
                setEditErrors((prev) => ({ ...prev, serviceId: undefined }));
              }}
              className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errorClass(Boolean(editErrors.serviceId))}`}
            >
              <option value="">Selecciona servicio</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            {editErrors.serviceId && <p className="text-xs text-destructive">{editErrors.serviceId}</p>}
            <Input
              type="datetime-local"
              value={editForm.appointmentAt}
              onChange={(e) => {
                setEditForm((prev) => ({ ...prev, appointmentAt: e.target.value }));
                setEditErrors((prev) => ({ ...prev, appointmentAt: undefined }));
              }}
              className={errorClass(Boolean(editErrors.appointmentAt))}
            />
            {editErrors.appointmentAt && <p className="text-xs text-destructive">{editErrors.appointmentAt}</p>}
            <select
              value={editForm.status}
              onChange={(e) => {
                setEditForm((prev) => ({ ...prev, status: e.target.value as AppointmentItem["status"] }));
                setEditErrors((prev) => ({ ...prev, status: undefined }));
              }}
              className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errorClass(Boolean(editErrors.status))}`}
            >
              <option value="PENDING">Pendiente</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="COMPLETED">Completado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
            {editErrors.status && <p className="text-xs text-destructive">{editErrors.status}</p>}
            <Input
              placeholder="Notas (opcional)"
              value={editForm.notes}
              onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingEdit}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleSaveEdit();
              }}
              disabled={savingEdit}
            >
              {savingEdit ? "Guardando..." : "Guardar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar turno</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara el turno
              {deleteTarget ? ` de "${deleteTarget.clientName}"` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppointmentsTab;
