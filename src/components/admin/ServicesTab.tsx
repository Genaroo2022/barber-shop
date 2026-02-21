import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createAdminService,
  deleteAdminService,
  listAdminServices,
  updateAdminService,
  type ServiceItem,
} from "@/lib/api";

type ServiceForm = {
  name: string;
  price: string;
  durationMinutes: string;
  active: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  price: "",
  durationMinutes: "",
  active: true,
};

const ServicesTab = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newService, setNewService] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ServiceForm>(emptyForm);

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

  const parsePayload = (form: ServiceForm) => {
    const price = Number(form.price);
    const durationMinutes = Number(form.durationMinutes);
    if (!form.name.trim() || Number.isNaN(price) || Number.isNaN(durationMinutes)) {
      throw new Error("Completa nombre, precio y duracion");
    }
    return {
      name: form.name.trim(),
      price,
      durationMinutes,
      active: form.active,
    };
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      await createAdminService(parsePayload(newService));
      toast.success("Servicio creado");
      setNewService(emptyForm);
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
    setEditingForm({
      name: service.name,
      price: String(service.price),
      durationMinutes: String(service.durationMinutes),
      active: service.active,
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateAdminService(id, parsePayload(editingForm));
      toast.success("Servicio actualizado");
      setEditingId(null);
      fetchServices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el servicio";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Seguro que quieres eliminar este servicio?")) return;
    try {
      await deleteAdminService(id);
      toast.success("Servicio eliminado");
      fetchServices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el servicio";
      toast.error(message);
    }
  };

  if (loading) return <div className="text-muted-foreground">Cargando servicios...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold">Nuevo servicio</h3>
        <div className="grid md:grid-cols-4 gap-3">
          <Input
            placeholder="Nombre"
            value={newService.name}
            onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            placeholder="Precio"
            type="number"
            min="0"
            value={newService.price}
            onChange={(e) => setNewService((prev) => ({ ...prev, price: e.target.value }))}
          />
          <Input
            placeholder="Duracion (min)"
            type="number"
            min="1"
            value={newService.durationMinutes}
            onChange={(e) => setNewService((prev) => ({ ...prev, durationMinutes: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Checkbox
              id="new-service-active"
              checked={newService.active}
              onCheckedChange={(checked) => setNewService((prev) => ({ ...prev, active: checked === true }))}
            />
            <label htmlFor="new-service-active" className="text-sm text-muted-foreground">
              Activo
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
                  <Input
                    disabled={!isEditing}
                    value={isEditing ? editingForm.name : service.name}
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    disabled={!isEditing}
                    type="number"
                    min="0"
                    value={isEditing ? editingForm.price : String(service.price)}
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, price: e.target.value }))}
                  />
                  <Input
                    disabled={!isEditing}
                    type="number"
                    min="1"
                    value={isEditing ? editingForm.durationMinutes : String(service.durationMinutes)}
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`service-active-${service.id}`}
                      disabled={!isEditing}
                      checked={isEditing ? editingForm.active : service.active}
                      onCheckedChange={(checked) => setEditingForm((prev) => ({ ...prev, active: checked === true }))}
                    />
                    <label htmlFor={`service-active-${service.id}`} className="text-sm text-muted-foreground">
                      Activo
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdate(service.id)}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(service)}>
                      Editar
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(service.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ServicesTab;
