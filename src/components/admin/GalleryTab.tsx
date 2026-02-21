import { useEffect, useMemo, useState } from "react";
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
  createAdminGalleryImage,
  deleteAdminGalleryImage,
  listAdminGalleryImages,
  updateAdminGalleryImage,
  type GalleryImageItem,
} from "@/lib/api";

type GalleryForm = {
  title: string;
  category: string;
  sortOrder: string;
  active: boolean;
};

type GalleryFieldErrors = {
  title?: string;
  sortOrder?: string;
  file?: string;
};

const emptyForm: GalleryForm = {
  title: "",
  category: "",
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
  const [deleting, setDeleting] = useState(false);
  const [newForm, setNewForm] = useState<GalleryForm>(emptyForm);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newErrors, setNewErrors] = useState<GalleryFieldErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<GalleryForm>(emptyForm);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [editingErrors, setEditingErrors] = useState<GalleryFieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<GalleryImageItem | null>(null);

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

  const validateForm = (
    form: GalleryForm,
    options: {
      requireFile: boolean;
      selectedFile: File | null;
      excludeId?: string;
    }
  ) => {
    const errors: GalleryFieldErrors = {};
    if (!form.title.trim()) {
      errors.title = "Completa el titulo";
    }

    const sortOrder = Number(form.sortOrder);
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      errors.sortOrder = "El numero debe ser 0 o mayor";
    } else {
      const repeated = images.some((img) => img.sortOrder === sortOrder && img.id !== options.excludeId);
      if (repeated) {
        errors.sortOrder = "Ese numero ya esta en uso por otra foto";
      }
    }

    if (options.requireFile && !options.selectedFile) {
      errors.file = "Selecciona una imagen";
    }

    if (errors.title || errors.sortOrder || errors.file) {
      return { errors, payload: null };
    }

    return {
      errors: {},
      payload: {
        title: form.title.trim(),
        category: form.category.trim() || undefined,
        sortOrder,
        active: form.active,
      },
    };
  };

  const handleCreate = async () => {
    const validation = validateForm(newForm, { requireFile: true, selectedFile: newFile });
    if (!validation.payload) {
      setNewErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    try {
      setCreating(true);
      setUploading(true);
      setNewErrors({});
      const uploadedUrl = await uploadToCloudinary(newFile as File);
      const payload = {
        ...validation.payload,
        imageUrl: uploadedUrl,
      };

      await createAdminGalleryImage(payload);
      toast.success("Imagen agregada");
      setNewForm(emptyForm);
      setNewFile(null);
      setNewErrors({});
      fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo agregar la imagen";
      toast.error(message);
    } finally {
      setCreating(false);
      setUploading(false);
    }
  };

  const startEdit = (item: GalleryImageItem) => {
    setEditingId(item.id);
    setEditingFile(null);
    setEditingErrors({});
    setEditingForm({
      title: item.title,
      category: item.category ?? "",
      sortOrder: String(item.sortOrder),
      active: item.active,
    });
  };

  const handleSaveEdit = async (id: string) => {
    const currentImage = images.find((img) => img.id === id);
    if (!currentImage) {
      toast.error("Imagen no encontrada");
      return;
    }

    const validation = validateForm(editingForm, { requireFile: false, selectedFile: editingFile, excludeId: id });
    if (!validation.payload) {
      setEditingErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    try {
      setUploading(true);
      setEditingErrors({});
      const uploadedUrl = editingFile ? await uploadToCloudinary(editingFile) : currentImage.imageUrl;
      await updateAdminGalleryImage(
        id,
        {
          ...validation.payload,
          imageUrl: uploadedUrl,
        }
      );
      toast.success("Imagen actualizada");
      setEditingId(null);
      setEditingFile(null);
      setEditingErrors({});
      fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteAdminGalleryImage(deleteTarget.id);
      toast.success("Imagen eliminada");
      setDeleteTarget(null);
      fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const errorClass = (hasError: boolean) => (hasError ? "border-destructive focus-visible:ring-destructive" : "");

  if (loading) return <div className="text-muted-foreground">Cargando galeria...</div>;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold">Nueva imagen</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              placeholder="Titulo"
              value={newForm.title}
              onChange={(e) => {
                setNewForm((prev) => ({ ...prev, title: e.target.value }));
                setNewErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={errorClass(Boolean(newErrors.title))}
            />
            {newErrors.title && <p className="text-xs text-destructive">{newErrors.title}</p>}
          </div>
          <Input
            placeholder="Categoria (opcional)"
            value={newForm.category}
            onChange={(e) => setNewForm((prev) => ({ ...prev, category: e.target.value }))}
          />
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              placeholder="Numero de foto"
              value={newForm.sortOrder}
              onChange={(e) => {
                setNewForm((prev) => ({ ...prev, sortOrder: e.target.value }));
                setNewErrors((prev) => ({ ...prev, sortOrder: undefined }));
              }}
              className={errorClass(Boolean(newErrors.sortOrder))}
            />
            {newErrors.sortOrder && <p className="text-xs text-destructive">{newErrors.sortOrder}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setNewFile(e.target.files?.[0] ?? null);
                setNewErrors((prev) => ({ ...prev, file: undefined }));
              }}
              className={`max-w-sm ${errorClass(Boolean(newErrors.file))}`}
            />
            {newErrors.file && <p className="text-xs text-destructive">{newErrors.file}</p>}
          </div>
          {newFile && <p className="text-xs text-muted-foreground">Archivo seleccionado: {newFile.name}</p>}
          <div className="flex items-center gap-2">
            <Checkbox
              id="new-gallery-active"
              checked={newForm.active}
              onCheckedChange={(checked) => setNewForm((prev) => ({ ...prev, active: checked === true }))}
            />
            <label htmlFor="new-gallery-active" className="text-sm text-muted-foreground">
              Mostrar en la web
            </label>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating || uploading}>
          {creating || uploading ? "Guardando..." : "Agregar imagen"}
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
                <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                <div className="grid gap-2">
                  <Input
                    disabled={!isEditing}
                    value={isEditing ? form?.title || "" : item.title}
                    onChange={(e) => {
                      setEditingForm((prev) => ({ ...prev, title: e.target.value }));
                      setEditingErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    className={isEditing ? errorClass(Boolean(editingErrors.title)) : ""}
                  />
                  {isEditing && editingErrors.title && <p className="text-xs text-destructive">{editingErrors.title}</p>}
                  <Input
                    disabled={!isEditing}
                    value={isEditing ? form?.category || "" : item.category || ""}
                    placeholder="Categoria"
                    onChange={(e) => setEditingForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                  <Input
                    disabled={!isEditing}
                    type="number"
                    min="0"
                    value={isEditing ? form?.sortOrder || "0" : String(item.sortOrder)}
                    placeholder="Numero de foto"
                    onChange={(e) => {
                      setEditingForm((prev) => ({ ...prev, sortOrder: e.target.value }));
                      setEditingErrors((prev) => ({ ...prev, sortOrder: undefined }));
                    }}
                    className={isEditing ? errorClass(Boolean(editingErrors.sortOrder)) : ""}
                  />
                  {isEditing && editingErrors.sortOrder && (
                    <p className="text-xs text-destructive">{editingErrors.sortOrder}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditingFile(e.target.files?.[0] ?? null)}
                      className="max-w-sm"
                    />
                    {editingFile && (
                      <p className="text-xs text-muted-foreground">Archivo seleccionado: {editingFile.name}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`gallery-active-${item.id}`}
                        checked={form?.active}
                        onCheckedChange={(checked) =>
                          setEditingForm((prev) => ({ ...prev, active: checked === true }))
                        }
                      />
                      <label htmlFor={`gallery-active-${item.id}`} className="text-sm text-muted-foreground">
                        Mostrar en la web
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
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setEditingFile(null);
                          setEditingErrors({});
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => startEdit(item)}>
                      Editar
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(item)}>
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
            <AlertDialogTitle>Eliminar imagen</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara la foto
              {deleteTarget ? ` "${deleteTarget.title}"` : ""} de la galeria.
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

export default GalleryTab;
