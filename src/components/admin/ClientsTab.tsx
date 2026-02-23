import { useEffect, useState } from "react";
import { ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { deleteAdminClient, listAdminClients, mergeAdminClients, updateAdminClient, type ClientSummary } from "@/lib/api";

type ClientForm = {
  name: string;
  phone: string;
};

type ClientFormErrors = {
  name?: string;
  phone?: string;
};

type MergeFormErrors = {
  sourceClientId?: string;
  targetClientId?: string;
};

const emptyForm: ClientForm = {
  name: "",
  phone: "",
};

const ClientsTab = () => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<ClientFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeErrors, setMergeErrors] = useState<MergeFormErrors>({});

  const fetchClients = async () => {
    try {
      const data = await listAdminClients();
      setClients(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar clientes";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const startEdit = (client: ClientSummary) => {
    setEditingClient(client);
    setFormErrors({});
    setForm({
      name: client.clientName,
      phone: client.clientPhone,
    });
  };

  const handleSave = async () => {
    if (!editingClient) return;
    const errors: ClientFormErrors = {};
    if (!form.name.trim()) errors.name = "Completa el nombre";
    if (!form.phone.trim()) errors.phone = "Completa el telefono";
    if (errors.name || errors.phone) {
      setFormErrors(errors);
      toast.error("Completa nombre y telefono");
      return;
    }

    try {
      setSaving(true);
      setFormErrors({});
      await updateAdminClient(editingClient.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Cliente actualizado");
      setEditingClient(null);
      setForm(emptyForm);
      await fetchClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar cliente";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAdminClient(deleteTarget.id);
      toast.success("Cliente eliminado");
      setDeleteTarget(null);
      await fetchClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar cliente";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleMerge = async () => {
    const errors: MergeFormErrors = {};
    if (!mergeSourceId) errors.sourceClientId = "Selecciona cliente origen";
    if (!mergeTargetId) errors.targetClientId = "Selecciona cliente destino";
    if (mergeSourceId && mergeTargetId && mergeSourceId === mergeTargetId) {
      errors.targetClientId = "Origen y destino deben ser distintos";
    }

    if (errors.sourceClientId || errors.targetClientId) {
      setMergeErrors(errors);
      toast.error("Selecciona cliente origen y destino");
      return;
    }

    try {
      setMerging(true);
      setMergeErrors({});
      await mergeAdminClients(mergeSourceId, mergeTargetId);
      toast.success("Clientes fusionados");
      setMergeOpen(false);
      setMergeSourceId("");
      setMergeTargetId("");
      await fetchClients();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo fusionar clientes";
      toast.error(message);
    } finally {
      setMerging(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Cargando clientes...</div>;
  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Fusionar clientes
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Nombre</TableHead>
            <TableHead className="text-muted-foreground">Telefono</TableHead>
            <TableHead className="text-muted-foreground">Turnos totales</TableHead>
            <TableHead className="text-muted-foreground">Ultima visita</TableHead>
            <TableHead className="text-muted-foreground">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                No hay clientes registrados
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id} className="border-border">
                <TableCell className="font-medium">{client.clientName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.clientPhone}</TableCell>
                <TableCell className="text-sm">{client.totalAppointments}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{client.lastVisit}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(client)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                      onClick={() => setDeleteTarget(client)}
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(editingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
            setForm(emptyForm);
            setFormErrors({});
          }
        }}
      >
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Editar cliente</AlertDialogTitle>
            <AlertDialogDescription>Actualiza nombre y telefono del cliente.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }));
                setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={errorClass(Boolean(formErrors.name))}
            />
            {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            <Input
              placeholder="Télefono"
              value={form.phone}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, phone: e.target.value }));
                setFormErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              className={errorClass(Boolean(formErrors.phone))}
            />
            {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleSave();
              }}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara el cliente
              {deleteTarget ? ` "${deleteTarget.clientName}"` : ""}
              {" "}y sus turnos asociados.
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

      <AlertDialog
        open={mergeOpen}
        onOpenChange={(open) => {
          setMergeOpen(open);
          if (!open) {
            setMergeSourceId("");
            setMergeTargetId("");
            setMergeErrors({});
          }
        }}
      >
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Fusionar clientes</AlertDialogTitle>
            <AlertDialogDescription>
              Reasigna todos los turnos del cliente origen al cliente destino y elimina el origen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Cliente origen (se elimina)</label>
            <select
              value={mergeSourceId}
              onChange={(e) => {
                setMergeSourceId(e.target.value);
                setMergeErrors((prev) => ({ ...prev, sourceClientId: undefined }));
              }}
              className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errorClass(Boolean(mergeErrors.sourceClientId))}`}
            >
              <option value="">Selecciona cliente origen</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName} - {client.clientPhone}
                </option>
              ))}
            </select>
            {mergeErrors.sourceClientId && <p className="text-xs text-destructive">{mergeErrors.sourceClientId}</p>}

            <label className="text-xs text-muted-foreground">Cliente destino (se conserva)</label>
            <select
              value={mergeTargetId}
              onChange={(e) => {
                setMergeTargetId(e.target.value);
                setMergeErrors((prev) => ({ ...prev, targetClientId: undefined }));
              }}
              className={`w-full h-10 rounded-md border bg-background px-3 text-sm ${errorClass(Boolean(mergeErrors.targetClientId))}`}
            >
              <option value="">Selecciona cliente destino</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName} - {client.clientPhone}
                </option>
              ))}
            </select>
            {mergeErrors.targetClientId && <p className="text-xs text-destructive">{mergeErrors.targetClientId}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleMerge();
              }}
              disabled={merging}
            >
              {merging ? "Fusionando..." : "Fusionar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientsTab;
