import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createAdminGalleryImage,
  deleteAdminGalleryImage,
  listAdminGalleryImages,
  updateAdminGalleryImage,
  type GalleryImageItem,
} from "@/lib/api";

type GalleryForm = {
  title: string;
  category: string;
  imageUrl: string;
  sortOrder: string;
  active: boolean;
};

const emptyForm: GalleryForm = {
  title: "",
  category: "",
  imageUrl: "",
  sortOrder: "0",
  active: true,
};

const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Falta configurar Cloudinary (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET)");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload?.secure_url) {
    throw new Error(payload?.error?.message || "No se pudo subir la imagen");
  }
  return payload.secure_url as string;
};

const GalleryTab = () => {
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newForm, setNewForm] = useState<GalleryForm>(emptyForm);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<GalleryForm>(emptyForm);
  const [editingFile, setEditingFile] = useState<File | null>(null);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [images]
  );

  const fetchImages = async () => {
    try {
      const data = await listAdminGalleryImages();
      setImages(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar imagenes";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const parseForm = (form: GalleryForm) => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      throw new Error("Completa titulo e imagen");
    }
    const sortOrder = Number(form.sortOrder);
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      throw new Error("El orden debe ser 0 o mayor");
    }
    return {
      title: form.title.trim(),
      category: form.category.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      sortOrder,
      active: form.active,
    };
  };

  const uploadAndSet = async (file: File, mode: "new" | "edit") => {
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file);
      if (mode === "new") {
        setNewForm((prev) => ({ ...prev, imageUrl: url }));
      } else {
        setEditingForm((prev) => ({ ...prev, imageUrl: url }));
      }
      toast.success("Imagen subida");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir la imagen";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const uploadedUrl = !newForm.imageUrl.trim() && newFile ? await uploadToCloudinary(newFile) : null;
      const payload = parseForm({
        ...newForm,
        imageUrl: uploadedUrl ?? newForm.imageUrl,
      });
      await createAdminGalleryImage(payload);
      toast.success("Imagen agregada");
      setNewForm(emptyForm);
      setNewFile(null);
      fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo agregar la imagen";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (item: GalleryImageItem) => {
    setEditingId(item.id);
    setEditingFile(null);
    setEditingForm({
      title: item.title,
      category: item.category ?? "",
      imageUrl: item.imageUrl,
      sortOrder: String(item.sortOrder),
      active: item.active,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const uploadedUrl = !editingForm.imageUrl.trim() && editingFile ? await uploadToCloudinary(editingFile) : null;
      await updateAdminGalleryImage(
        id,
        parseForm({
          ...editingForm,
          imageUrl: uploadedUrl ?? editingForm.imageUrl,
        })
      );
      toast.success("Imagen actualizada");
      setEditingId(null);
      fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Seguro que quieres eliminar esta imagen?")) return;
    try {
      await deleteAdminGalleryImage(id);
      toast.success("Imagen eliminada");
      fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar";
      toast.error(message);
    }
  };

  if (loading) return <div className="text-muted-foreground">Cargando galeria...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold">Nueva imagen</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Input
            placeholder="Titulo"
            value={newForm.title}
            onChange={(e) => setNewForm((prev) => ({ ...prev, title: e.target.value }))}
          />
          <Input
            placeholder="Categoria (opcional)"
            value={newForm.category}
            onChange={(e) => setNewForm((prev) => ({ ...prev, category: e.target.value }))}
          />
          <Input
            placeholder="URL de imagen"
            value={newForm.imageUrl}
            onChange={(e) => setNewForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          />
          <Input
            type="number"
            min="0"
            placeholder="Orden"
            value={newForm.sortOrder}
            onChange={(e) => setNewForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!newFile || uploading}
            onClick={() => newFile && uploadAndSet(newFile, "new")}
          >
            {uploading ? "Subiendo..." : "Subir a Cloudinary"}
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              id="new-gallery-active"
              checked={newForm.active}
              onCheckedChange={(checked) => setNewForm((prev) => ({ ...prev, active: checked === true }))}
            />
            <label htmlFor="new-gallery-active" className="text-sm text-muted-foreground">
              Activa
            </label>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating || uploading}>
          {creating ? "Guardando..." : "Agregar imagen"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sortedImages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay imagenes cargadas.</p>
        ) : (
          sortedImages.map((item) => {
            const isEditing = editingId === item.id;
            const form = isEditing ? editingForm : null;

            return (
              <div key={item.id} className="glass-card rounded-xl p-4 space-y-3">
                <img src={isEditing ? form?.imageUrl || item.imageUrl : item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                <div className="grid gap-2">
                  <Input
                    disabled={!isEditing}
                    value={isEditing ? form?.title || "" : item.title}
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <Input
                    disabled={!isEditing}
                    value={isEditing ? form?.category || "" : item.category || ""}
                    placeholder="Categoria"
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                  <Input
                    disabled={!isEditing}
                    value={isEditing ? form?.imageUrl || "" : item.imageUrl}
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                  <Input
                    disabled={!isEditing}
                    type="number"
                    min="0"
                    value={isEditing ? form?.sortOrder || "0" : String(item.sortOrder)}
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditingFile(e.target.files?.[0] ?? null)}
                      className="max-w-sm"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!editingFile || uploading}
                      onClick={() => editingFile && uploadAndSet(editingFile, "edit")}
                    >
                      {uploading ? "Subiendo..." : "Subir nueva imagen"}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`gallery-active-${item.id}`}
                        checked={form?.active}
                        onCheckedChange={(checked) =>
                          setEditingForm((prev) => ({ ...prev, active: checked === true }))
                        }
                      />
                      <label htmlFor={`gallery-active-${item.id}`} className="text-sm text-muted-foreground">
                        Activa
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => handleSaveEdit(item.id)}>
                        Guardar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(item)}>
                      Editar
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
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

export default GalleryTab;
