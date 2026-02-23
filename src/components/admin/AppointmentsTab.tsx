import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Check, ChevronLeft, ChevronRight, Download, Loader2, Pencil, Trash2, X } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  deleteAdminAppointment,
  listAdminAppointments,
  listAdminStalePendingAppointments,
  listAdminServices,
  updateAdminAppointment,
  updateAdminAppointmentStatus,
  type AppointmentItem,
  type ServiceItem,
  type StalePendingAppointmentItem,
} from "@/lib/api";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { clearAccessToken } from "@/lib/auth";
import { getCurrentMonthKey, isInMonth, monthKeyForFilename } from "@/lib/month";

const statusColors: Record<AppointmentItem["status"], string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  CONFIRMED: "bg-green-500/10 text-green-500 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  COMPLETED: "bg-sky-500/10 text-sky-500 border-sky-500/20",
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

const shiftMonthKey = (monthKey: string, delta: number): string => {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return monthKey;
  }
  const date = new Date(year, month - 1 + delta, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [staleThresholdMinutes, setStaleThresholdMinutes] = useState("30");
  const [stalePendingAppointments, setStalePendingAppointments] = useState<StalePendingAppointmentItem[]>([]);
  const [loadingAssistant, setLoadingAssistant] = useState(false);

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
      await fetchAppointments();
    } catch {
      // no toast for status updates by request
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
      setEditingAppointment(null);
      setEditForm(emptyEditForm);
      await fetchAppointments();
    } catch {
      // no toast for appointment edit by request
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAdminAppointment(deleteTarget.id);
      setDeleteTarget(null);
      await fetchAppointments();
    } catch {
      // no toast for appointment delete by request
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

  const parsedThreshold = Number.parseInt(staleThresholdMinutes, 10);
  const thresholdIsValid = Number.isFinite(parsedThreshold) && parsedThreshold >= 1;

  const fetchStalePendingAppointments = async (options?: { silent?: boolean }) => {
    if (!thresholdIsValid) {
      if (!options?.silent) {
        toast.error("El umbral debe ser un numero mayor o igual a 1");
      }
      return;
    }

    try {
      setLoadingAssistant(true);
      const stale = await listAdminStalePendingAppointments(parsedThreshold);
      setStalePendingAppointments(stale);
      if (!options?.silent) {
        if (stale.length === 0) {
          toast.success("No hay turnos pendientes colgados");
        } else {
          toast.warning(
            stale.length === 1
              ? "Se detecto 1 turno pendiente sin confirmar"
              : `Se detectaron ${stale.length} turnos pendientes sin confirmar`
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo analizar turnos pendientes";
      if (!options?.silent) {
        toast.error(message);
      }
    } finally {
      setLoadingAssistant(false);
    }
  };

  const formatMinutesPending = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${remainingMinutes} min`;
  };

  const getSeverity = (minutes: number): {
    label: string;
    containerClass: string;
    pillClass: string;
  } => {
    if (minutes >= 12 * 60) {
      return {
        label: "Critico (12h+)",
        containerClass: "border-red-500/40 bg-red-500/10",
        pillClass: "bg-red-500/15 text-red-400 border-red-500/40",
      };
    }
    if (minutes >= 6 * 60) {
      return {
        label: "Alto (6h+)",
        containerClass: "border-orange-500/40 bg-orange-500/10",
        pillClass: "bg-orange-500/15 text-orange-400 border-orange-500/40",
      };
    }
    if (minutes >= 2 * 60) {
      return {
        label: "Medio (2h+)",
        containerClass: "border-amber-500/40 bg-amber-500/10",
        pillClass: "bg-amber-500/15 text-amber-300 border-amber-500/40",
      };
    }
    return {
      label: "Bajo",
      containerClass: "border-border bg-background/60",
      pillClass: "bg-secondary/60 text-muted-foreground border-border",
    };
  };

  if (loading) return <div className="text-muted-foreground">Cargando turnos...</div>;
  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="grid md:grid-cols-[200px_1fr] gap-3 items-center">
          <p className="text-sm text-muted-foreground">Mes a consultar</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, -1))}
              title="Mes anterior"
              aria-label="Ir al mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-picker-strong"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => setSelectedMonth((prev) => shiftMonthKey(prev, 1))}
              title="Mes siguiente"
              aria-label="Ir al mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAssistantOpen(true);
            void fetchStalePendingAppointments({ silent: true });
          }}
        >
          <BellRing className="w-4 h-4 mr-2" />
          Asistente de Gestion
        </Button>
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

      <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
        <DialogContent className="glass-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asistente de Gestion de Turnos</DialogTitle>
            <DialogDescription>
              Detecta turnos en estado pendiente sin confirmar por mas tiempo del esperado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid md:grid-cols-[220px_1fr_auto] gap-2 items-center">
              <p className="text-sm text-muted-foreground">Umbral en minutos</p>
              <Input
                type="number"
                min={1}
                step={1}
                value={staleThresholdMinutes}
                onChange={(e) => setStaleThresholdMinutes(e.target.value)}
              />
              <Button
                onClick={() => {
                  void fetchStalePendingAppointments();
                }}
                disabled={loadingAssistant}
              >
                {loadingAssistant ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  "Analizar ahora"
                )}
              </Button>
            </div>

            {!thresholdIsValid && (
              <p className="text-xs text-destructive">Ingresa un valor valido (&gt;= 1).</p>
            )}

            {stalePendingAppointments.length === 0 ? (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                No hay turnos pendientes que superen el umbral configurado.
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <p className="text-sm">
                  <span className="font-semibold text-amber-500">{stalePendingAppointments.length}</span>{" "}
                  turnos requieren seguimiento.
                </p>
                <div className="max-h-[320px] overflow-auto space-y-2">
                  {stalePendingAppointments.map((apt) => {
                    const date = new Date(apt.appointmentAt);
                    const severity = getSeverity(apt.minutesPending);
                    return (
                      <div key={apt.id} className={`rounded-md border p-3 ${severity.containerClass}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{apt.clientName}</p>
                            <p className="text-xs text-muted-foreground">{apt.clientPhone}</p>
                            <p className="text-sm mt-1">
                              {apt.serviceName} | {format(date, "d MMM yyyy", { locale: es })} | {format(date, "HH:mm")}
                              hs
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                              Pendiente hace {formatMinutesPending(apt.minutesPending)}
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] mt-2 ${severity.pillClass}`}
                            >
                              Prioridad: {severity.label}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-500 hover:text-green-400"
                              onClick={() => {
                                void updateStatus(apt.id, "CONFIRMED").then(() =>
                                  fetchStalePendingAppointments({ silent: true })
                                );
                              }}
                              title="Confirmar"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-400"
                              onClick={() => {
                                void updateStatus(apt.id, "CANCELLED").then(() =>
                                  fetchStalePendingAppointments({ silent: true })
                                );
                              }}
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
