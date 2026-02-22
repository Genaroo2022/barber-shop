import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { deleteAdminClient, listAdminClients, updateAdminClient, type ClientSummary } from "@/lib/api";

type ClientForm = {
  name: string;
  phone: string;
};

type ClientFormErrors = {
  name?: string;
  phone?: string;
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

  if (loading) return <div className="text-muted-foreground">Cargando clientes...</div>;
  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");

  return (
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
              placeholder="Telefono"
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
    </div>
  );
};

export default ClientsTab;
