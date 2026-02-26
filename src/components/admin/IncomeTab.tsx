import { useEffect, useMemo, useState } from "react";
import { DollarSign, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createAdminManualIncome,
  deleteAdminManualIncome,
  getAdminIncome,
  listAdminAppointments,
  updateAdminManualIncome,
  type AppointmentItem,
  type IncomeBreakdownItem,
  type ManualIncomeEntry,
} from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { getCurrentMonthKey, isInMonth, monthKeyForFilename } from "@/lib/month";

type ManualIncomeErrors = {
  amount?: string;
  tipAmount?: string;
  occurredOn?: string;
};

type ManualIncomeForm = {
  amount: string;
  tipAmount: string;
  occurredOn: string;
  notes: string;
};

const emptyManualForm = (): ManualIncomeForm => ({
  amount: "",
  tipAmount: "",
  occurredOn: new Date().toISOString().slice(0, 10),
  notes: "",
});

const IncomeTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualIncomeEntry[]>([]);

  const [savingManualIncome, setSavingManualIncome] = useState(false);
  const [updatingManualIncome, setUpdatingManualIncome] = useState(false);
  const [deletingManualIncome, setDeletingManualIncome] = useState(false);

  const [manualForm, setManualForm] = useState<ManualIncomeForm>(emptyManualForm);
  const [manualErrors, setManualErrors] = useState<ManualIncomeErrors>({});

  const [editingEntry, setEditingEntry] = useState<ManualIncomeEntry | null>(null);
  const [editingForm, setEditingForm] = useState<ManualIncomeForm>(emptyManualForm);
  const [editingErrors, setEditingErrors] = useState<ManualIncomeErrors>({});

  const [deleteTarget, setDeleteTarget] = useState<ManualIncomeEntry | null>(null);

  const fetchIncome = async () => {
    try {
      const [income, appointments] = await Promise.all([
        getAdminIncome(selectedMonth),
        listAdminAppointments(selectedMonth),
      ]);
      setManualEntries(
        income.manualEntries.map((entry) => ({
          ...entry,
          amount: Number(entry.amount) || 0,
          tipAmount: Number(entry.tipAmount) || 0,
          total: Number(entry.total) || 0,
        }))
      );
      setAppointments(
        appointments.map((appointment) => ({
          ...appointment,
          servicePrice: Number(appointment.servicePrice) || 0,
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar ingresos";
      toast.error(message);
    }
  };

  useEffect(() => {
    void fetchIncome();
  }, [selectedMonth]);

  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");
  const formatPrice = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const filteredManualEntries = useMemo(
    () => manualEntries.filter((entry) => isInMonth(entry.occurredOn, selectedMonth)),
    [manualEntries, selectedMonth]
  );
  const filteredCompletedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "COMPLETED" && isInMonth(appointment.appointmentAt, selectedMonth)
      ),
    [appointments, selectedMonth]
  );

  const monthRegisteredIncome = filteredCompletedAppointments.reduce(
    (sum, appointment) => sum + appointment.servicePrice,
    0
  );
  const monthManualIncome = filteredManualEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const monthTips = filteredManualEntries.reduce((sum, entry) => sum + entry.tipAmount, 0);
  const monthTotalIncome = monthRegisteredIncome + monthManualIncome + monthTips;

  const monthlyBreakdown: IncomeBreakdownItem[] = useMemo(() => {
    const byService = new Map<string, { count: number; total: number }>();
    filteredCompletedAppointments.forEach((appointment) => {
      const prev = byService.get(appointment.serviceName) ?? { count: 0, total: 0 };
      byService.set(appointment.serviceName, {
        count: prev.count + 1,
        total: prev.total + appointment.servicePrice,
      });
    });
    filteredManualEntries.forEach((entry) => {
      const manualPrev = byService.get("Ingresos manuales") ?? { count: 0, total: 0 };
      byService.set("Ingresos manuales", {
        count: manualPrev.count + 1,
        total: manualPrev.total + entry.amount,
      });
      if (entry.tipAmount > 0) {
        const tipPrev = byService.get("Propinas") ?? { count: 0, total: 0 };
        byService.set("Propinas", {
          count: tipPrev.count + 1,
          total: tipPrev.total + entry.tipAmount,
        });
      }
    });
    return Array.from(byService.entries())
      .map(([serviceName, values]) => ({ serviceName, count: values.count, total: values.total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredCompletedAppointments, filteredManualEntries]);

  const validateManualIncome = (form: ManualIncomeForm) => {
    const errors: ManualIncomeErrors = {};
    const amount = form.amount.trim() === "" ? 0 : Number(form.amount);
    const tipAmount = form.tipAmount.trim() === "" ? 0 : Number(form.tipAmount);

    if (Number.isNaN(amount) || amount < 0) errors.amount = "Completa un monto valido (0 o mayor)";
    if (Number.isNaN(tipAmount) || tipAmount < 0) errors.tipAmount = "La propina debe ser 0 o mayor";
    if (!form.occurredOn) errors.occurredOn = "Selecciona una fecha";
    if (amount + tipAmount <= 0) errors.amount = "Ingresa un monto o una propina";

    if (errors.amount || errors.tipAmount || errors.occurredOn) {
      return { errors, payload: null };
    }

    return {
      errors: {},
      payload: {
        amount,
        tipAmount,
        occurredOn: form.occurredOn,
        notes: form.notes.trim() || undefined,
      },
    };
  };

  const handleAddManualIncome = async () => {
    const validation = validateManualIncome(manualForm);
    if (!validation.payload) {
      setManualErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }
    try {
      setSavingManualIncome(true);
      setManualErrors({});
      await createAdminManualIncome(validation.payload);
      toast.success("Ingreso manual guardado");
      setManualForm(emptyManualForm());
      await fetchIncome();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar";
      toast.error(message);
    } finally {
      setSavingManualIncome(false);
    }
  };

  const startEditManualIncome = (entry: ManualIncomeEntry) => {
    setEditingEntry(entry);
    setEditingErrors({});
    setEditingForm({
      amount: entry.amount.toString(),
      tipAmount: entry.tipAmount.toString(),
      occurredOn: entry.occurredOn,
      notes: entry.notes ?? "",
    });
  };

  const handleUpdateManualIncome = async () => {
    if (!editingEntry) return;
    const validation = validateManualIncome(editingForm);
    if (!validation.payload) {
      setEditingErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }
    try {
      setUpdatingManualIncome(true);
      setEditingErrors({});
      await updateAdminManualIncome(editingEntry.id, validation.payload);
      toast.success("Ingreso actualizado");
      setEditingEntry(null);
      await fetchIncome();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar";
      toast.error(message);
    } finally {
      setUpdatingManualIncome(false);
    }
  };

  const handleDeleteManualIncome = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingManualIncome(true);
      await deleteAdminManualIncome(deleteTarget.id);
      toast.success("Ingreso eliminado");
      setDeleteTarget(null);
      await fetchIncome();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar";
      toast.error(message);
    } finally {
      setDeletingManualIncome(false);
    }
  };

  const exportIncomeCsv = () => {
    const summaryRows: Array<Array<string | number>> = [
      ["Mes", selectedMonth],
      ["Ingreso registrado (turnos)", monthRegisteredIncome],
      ["Ingresos manuales", monthManualIncome],
      ["Propinas", monthTips],
      ["Ingreso total", monthTotalIncome],
    ];

    const breakdownRows = monthlyBreakdown.map((item) => [item.serviceName, item.count, item.total]);
    const manualRows = filteredManualEntries.map((entry) => [
      entry.occurredOn,
      entry.amount,
      entry.tipAmount,
      entry.total,
      entry.notes ?? "",
    ]);
    const summaryCsv = buildCsv(["Concepto", "Valor"], summaryRows);
    const breakdownCsv = buildCsv(["Servicio", "Cantidad", "Total"], breakdownRows);
    const manualCsv = buildCsv(["Fecha", "Monto", "Propina", "Total", "Notas"], manualRows);
    const csv = `${summaryCsv}\n\n${breakdownCsv}\n\n${manualCsv}`;

    downloadCsv(`ingresos_${monthKeyForFilename(selectedMonth)}.csv`, csv);
    toast.success("CSV de ingresos descargado");
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-center">
          <p className="text-sm text-muted-foreground">Mes a consultar</p>
          <Input
            id="income-month"
            name="income-month"
            aria-label="Mes a consultar"
            type="month"
            autoComplete="off"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={exportIncomeCsv}>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-6 gold-border-glow">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Ingreso total del mes</span>
          </div>
          <p className="text-3xl font-display font-bold gold-text">{formatPrice(monthTotalIncome)}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Turnos completados</span>
          </div>
          <p className="text-3xl font-display font-bold">{formatPrice(monthRegisteredIncome)}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-muted-foreground">Ingresos manuales</span>
          </div>
          <p className="text-3xl font-display font-bold">{formatPrice(monthManualIncome)}</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-muted-foreground">Propinas</span>
          </div>
          <p className="text-3xl font-display font-bold">{formatPrice(monthTips)}</p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold">Cargar ingreso manual</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 12000 (solo número)"
              value={manualForm.amount}
              onChange={(e) => {
                setManualForm((prev) => ({ ...prev, amount: e.target.value }));
                setManualErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              className={errorClass(Boolean(manualErrors.amount))}
            />
            {manualErrors.amount && <p className="text-xs text-destructive">{manualErrors.amount}</p>}
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 2000 (opcional)"
              value={manualForm.tipAmount}
              onChange={(e) => {
                setManualForm((prev) => ({ ...prev, tipAmount: e.target.value }));
                setManualErrors((prev) => ({ ...prev, tipAmount: undefined }));
              }}
              className={errorClass(Boolean(manualErrors.tipAmount))}
            />
            {manualErrors.tipAmount && <p className="text-xs text-destructive">{manualErrors.tipAmount}</p>}
          </div>
          <div className="space-y-1">
            <Input
              aria-label="Fecha del ingreso manual"
              type="date"
              value={manualForm.occurredOn}
              onChange={(e) => {
                setManualForm((prev) => ({ ...prev, occurredOn: e.target.value }));
                setManualErrors((prev) => ({ ...prev, occurredOn: undefined }));
              }}
              className={errorClass(Boolean(manualErrors.occurredOn))}
            />
            {manualErrors.occurredOn && <p className="text-xs text-destructive">{manualErrors.occurredOn}</p>}
          </div>
        </div>
        <Textarea
          placeholder="Ej: Corte premium + lavado (opcional)"
          value={manualForm.notes}
          onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
        />
        <Button onClick={handleAddManualIncome} disabled={savingManualIncome}>
          {savingManualIncome ? "Guardando..." : "Agregar ingreso"}
        </Button>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold mb-4">Desglose de ingresos del mes</h3>
        {monthlyBreakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay ingresos registrados para ese mes</p>
        ) : (
          <div className="space-y-3">
            {monthlyBreakdown.map((item) => (
              <div
                key={item.serviceName}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{item.serviceName}</p>
                  <p className="text-xs text-muted-foreground">{item.count} registros</p>
                </div>
                <p className="font-display font-semibold gold-text">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="font-display font-semibold mb-4">Ingresos manuales del mes</h3>
        {filteredManualEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay ingresos manuales para ese mes</p>
        ) : (
          <div className="space-y-3">
            {filteredManualEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 py-2 border-b border-border/50 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{entry.occurredOn}</p>
                  <p className="text-xs text-muted-foreground">{entry.notes || "Sin notas"}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-display font-semibold gold-text">{formatPrice(entry.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Monto {formatPrice(entry.amount)} | Propina {formatPrice(entry.tipAmount)}
                  </p>
                  <div className="flex flex-wrap justify-start gap-2 mt-2 sm:justify-end">
                    <Button size="sm" variant="secondary" onClick={() => startEditManualIncome(entry)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(entry)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(editingEntry)} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>Editar ingreso manual</DialogTitle>
            <DialogDescription>Actualiza monto, propina, fecha o nota.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 12000 (solo número)"
                value={editingForm.amount}
                onChange={(e) => {
                  setEditingForm((prev) => ({ ...prev, amount: e.target.value }));
                  setEditingErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                className={errorClass(Boolean(editingErrors.amount))}
              />
              {editingErrors.amount && <p className="text-xs text-destructive">{editingErrors.amount}</p>}
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej: 2000 (opcional)"
                value={editingForm.tipAmount}
                onChange={(e) => {
                  setEditingForm((prev) => ({ ...prev, tipAmount: e.target.value }));
                  setEditingErrors((prev) => ({ ...prev, tipAmount: undefined }));
                }}
                className={errorClass(Boolean(editingErrors.tipAmount))}
              />
              {editingErrors.tipAmount && <p className="text-xs text-destructive">{editingErrors.tipAmount}</p>}
            </div>
            <div className="space-y-1">
              <Input
                type="date"
                value={editingForm.occurredOn}
                onChange={(e) => {
                  setEditingForm((prev) => ({ ...prev, occurredOn: e.target.value }));
                  setEditingErrors((prev) => ({ ...prev, occurredOn: undefined }));
                }}
                className={errorClass(Boolean(editingErrors.occurredOn))}
              />
              {editingErrors.occurredOn && <p className="text-xs text-destructive">{editingErrors.occurredOn}</p>}
            </div>
            <Textarea
              placeholder="Ej: Corte premium + lavado (opcional)"
              value={editingForm.notes}
              onChange={(e) => setEditingForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditingEntry(null)} disabled={updatingManualIncome}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateManualIncome} disabled={updatingManualIncome}>
              {updatingManualIncome ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ingreso manual</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el ingreso de {deleteTarget?.occurredOn}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingManualIncome}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteManualIncome}
              disabled={deletingManualIncome}
            >
              {deletingManualIncome ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IncomeTab;
