import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  createAdminService,
  deleteAdminService,
  listAdminServices,
  updateAdminService,
  type ServiceItem,
} from "@/lib/api";
import { emitContentRefresh } from "@/lib/content-refresh";

type ServiceForm = {
  name: string;
  price: string;
  durationMinutes: string;
  description: string;
  active: boolean;
};

type ServiceFormErrors = {
  name?: string;
  price?: string;
  durationMinutes?: string;
};

const emptyForm: ServiceForm = {
  name: "",
  price: "",
  durationMinutes: "",
  description: "",
  active: true,
};

const ServicesTab = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newService, setNewService] = useState<ServiceForm>(emptyForm);
  const [newServiceErrors, setNewServiceErrors] = useState<ServiceFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ServiceForm>(emptyForm);
  const [editingErrors, setEditingErrors] = useState<ServiceFormErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);

  const fetchServices = async () => {
    try {
      const data = await listAdminServices();
      setServices(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar servicios";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const validateServiceForm = (form: ServiceForm) => {
    const errors: ServiceFormErrors = {};

    if (!form.name.trim()) {
      errors.name = "Completa el nombre";
    }

    const price = Number(form.price);
    if (form.price.trim() === "" || Number.isNaN(price) || price < 0) {
      errors.price = "Ingresa un precio valido (0 o mayor)";
    }

    const durationMinutes = Number(form.durationMinutes);
    if (form.durationMinutes.trim() === "" || Number.isNaN(durationMinutes) || durationMinutes < 1) {
      errors.durationMinutes = "Ingresa una duracion valida (1 o mayor)";
    }

    if (errors.name || errors.price || errors.durationMinutes) {
      return { errors, payload: null };
    }

    return {
      errors: {},
      payload: {
        name: form.name.trim(),
        price,
        durationMinutes,
        description: form.description.trim() || undefined,
        active: form.active,
      },
    };
  };

  const handleCreate = async () => {
    const validation = validateServiceForm(newService);
    if (!validation.payload) {
      setNewServiceErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    try {
      setCreating(true);
      setNewServiceErrors({});
      await createAdminService(validation.payload);
      toast.success("Servicio creado");
      setNewService(emptyForm);
      setNewServiceErrors({});
      emitContentRefresh("services");
      fetchServices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear el servicio";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (service: ServiceItem) => {
    setEditingId(service.id);
    setEditingErrors({});
    setEditingForm({
      name: service.name,
      price: String(service.price),
      durationMinutes: String(service.durationMinutes),
      description: service.description ?? "",
      active: service.active,
    });
  };

  const handleUpdate = async (id: string) => {
    const validation = validateServiceForm(editingForm);
    if (!validation.payload) {
      setEditingErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    try {
      setEditingErrors({});
      await updateAdminService(id, validation.payload);
      toast.success("Servicio actualizado");
      setEditingId(null);
      setEditingErrors({});
      emitContentRefresh("services");
      fetchServices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el servicio";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAdminService(deleteTarget.id);
      toast.success("Servicio eliminado");
      setDeleteTarget(null);
      emitContentRefresh("services");
      fetchServices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el servicio";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");

  if (loading) return <div className="text-muted-foreground">Cargando servicios...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold">Nuevo servicio</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label htmlFor="new-service-name" className="text-xs text-muted-foreground">Nombre del servicio</label>
            <Input
              id="new-service-name"
              placeholder="Ej: Corte clásico"
              value={newService.name}
              onChange={(e) => {
                setNewService((prev) => ({ ...prev, name: e.target.value }));
                setNewServiceErrors((prev) => ({ ...prev, name: undefined }));
              }}
              className={errorClass(Boolean(newServiceErrors.name))}
            />
            {newServiceErrors.name && <p className="text-xs text-destructive">{newServiceErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="new-service-price" className="text-xs text-muted-foreground">Precio</label>
            <Input
              id="new-service-price"
              placeholder="Ej: 12000"
              type="number"
              min="0"
              value={newService.price}
              onChange={(e) => {
                setNewService((prev) => ({ ...prev, price: e.target.value }));
                setNewServiceErrors((prev) => ({ ...prev, price: undefined }));
              }}
              className={errorClass(Boolean(newServiceErrors.price))}
            />
            {newServiceErrors.price && <p className="text-xs text-destructive">{newServiceErrors.price}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="new-service-duration" className="text-xs text-muted-foreground">Duración (min)</label>
            <Input
              id="new-service-duration"
              placeholder="Ej: 45 (min)"
              type="number"
              min="1"
              value={newService.durationMinutes}
              onChange={(e) => {
                setNewService((prev) => ({ ...prev, durationMinutes: e.target.value }));
                setNewServiceErrors((prev) => ({ ...prev, durationMinutes: undefined }));
              }}
              className={errorClass(Boolean(newServiceErrors.durationMinutes))}
            />
            {newServiceErrors.durationMinutes && (
              <p className="text-xs text-destructive">{newServiceErrors.durationMinutes}</p>
            )}
          </div>
          <div className="md:col-span-4">
            <label htmlFor="new-service-description" className="text-xs text-muted-foreground">Descripción</label>
            <Input
              id="new-service-description"
              placeholder="Ej: Fade + barba (opcional)"
              value={newService.description}
              onChange={(e) => setNewService((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="new-service-active"
              checked={newService.active}
              onCheckedChange={(checked) => setNewService((prev) => ({ ...prev, active: checked === true }))}
            />
            <label htmlFor="new-service-active" className="text-sm text-muted-foreground">
              Mostrar en la web
            </label>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Guardando..." : "Crear servicio"}
        </Button>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="font-display text-lg font-semibold">Servicios cargados</h3>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay servicios.</p>
        ) : (
          services.map((service) => {
            const isEditing = editingId === service.id;
            return (
              <div key={service.id} className="border border-border/60 rounded-lg p-4 space-y-3">
                <div className="grid md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label htmlFor={`service-name-${service.id}`} className="text-xs text-muted-foreground">Nombre del servicio</label>
                    <Input
                      id={`service-name-${service.id}`}
                      disabled={!isEditing}
                      value={isEditing ? editingForm.name : service.name}
                      onChange={(e) => {
                        setEditingForm((prev) => ({ ...prev, name: e.target.value }));
                        setEditingErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      className={isEditing ? errorClass(Boolean(editingErrors.name)) : ""}
                    />
                    {isEditing && editingErrors.name && <p className="text-xs text-destructive">{editingErrors.name}</p>}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`service-price-${service.id}`} className="text-xs text-muted-foreground">Precio</label>
                    <Input
                      id={`service-price-${service.id}`}
                      disabled={!isEditing}
                      type="number"
                      min="0"
                      value={isEditing ? editingForm.price : String(service.price)}
                      onChange={(e) => {
                        setEditingForm((prev) => ({ ...prev, price: e.target.value }));
                        setEditingErrors((prev) => ({ ...prev, price: undefined }));
                      }}
                      className={isEditing ? errorClass(Boolean(editingErrors.price)) : ""}
                    />
                    {isEditing && editingErrors.price && (
                      <p className="text-xs text-destructive">{editingErrors.price}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`service-duration-${service.id}`} className="text-xs text-muted-foreground">Duración (min)</label>
                    <Input
                      id={`service-duration-${service.id}`}
                      disabled={!isEditing}
                      type="number"
                      min="1"
                      value={isEditing ? editingForm.durationMinutes : String(service.durationMinutes)}
                      onChange={(e) => {
                        setEditingForm((prev) => ({ ...prev, durationMinutes: e.target.value }));
                        setEditingErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                      }}
                      className={isEditing ? errorClass(Boolean(editingErrors.durationMinutes)) : ""}
                    />
                    {isEditing && editingErrors.durationMinutes && (
                      <p className="text-xs text-destructive">{editingErrors.durationMinutes}</p>
                    )}
                  </div>
                  <div className="md:col-span-4">
                    <label htmlFor={`service-description-${service.id}`} className="text-xs text-muted-foreground">Descripción</label>
                    <Input
                      id={`service-description-${service.id}`}
                      disabled={!isEditing}
                      placeholder="Ej: Fade + barba (opcional)"
                      value={isEditing ? editingForm.description : service.description ?? ""}
                      onChange={(e) => setEditingForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`service-active-${service.id}`}
                      disabled={!isEditing}
                      checked={isEditing ? editingForm.active : service.active}
                      onCheckedChange={(checked) => setEditingForm((prev) => ({ ...prev, active: checked === true }))}
                    />
                    <label htmlFor={`service-active-${service.id}`} className="text-sm text-muted-foreground">
                      Mostrar en la web
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdate(service.id)}>
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setEditingErrors({});
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(service)}>
                      Editar
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(service)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el servicio
              {deleteTarget ? ` "${deleteTarget.name}"` : ""}.
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

export default ServicesTab;
