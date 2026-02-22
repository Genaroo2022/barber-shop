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

type UploadMode = "single" | "multiple";
type MultiTitleErrors = Record<number, string>;

type GalleryFormPayload = {
  title: string;
  category?: string;
  sortOrder: number;
  active: boolean;
};

type PendingSortSwap = {
  currentId: string;
  targetId: string;
  payload: GalleryFormPayload;
  file: File | null;
};

type BulkDeleteMode = "selected" | "all";

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
  const [uploadMode, setUploadMode] = useState<UploadMode>("single");
  const [newForm, setNewForm] = useState<GalleryForm>(emptyForm);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFileTitles, setNewFileTitles] = useState<string[]>([]);
  const [newMultiTitleErrors, setNewMultiTitleErrors] = useState<MultiTitleErrors>({});
  const [newErrors, setNewErrors] = useState<GalleryFieldErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<GalleryForm>(emptyForm);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [editingErrors, setEditingErrors] = useState<GalleryFieldErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<GalleryImageItem | null>(null);
  const [pendingSortSwap, setPendingSortSwap] = useState<PendingSortSwap | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<BulkDeleteMode | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [reorderFrom, setReorderFrom] = useState("");
  const [reorderTo, setReorderTo] = useState("");
  const [reorderError, setReorderError] = useState<string | null>(null);

  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [images]
  );
  const allSelected = images.length > 0 && selectedImageIds.length === images.length;
  const pendingCurrentImage = pendingSortSwap
    ? images.find((img) => img.id === pendingSortSwap.currentId) ?? null
    : null;
  const pendingTargetImage = pendingSortSwap
    ? images.find((img) => img.id === pendingSortSwap.targetId) ?? null
    : null;

  const fetchImages = async () => {
    try {
      const data = await listAdminGalleryImages();
      setImages(data);
      setSelectedImageIds((prev) => prev.filter((id) => data.some((img) => img.id === id)));
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
      requireTitle?: boolean;
      allowSortOrderConflict?: boolean;
      excludeId?: string;
    }
  ) => {
    const errors: GalleryFieldErrors = {};
    const titleRequired = options.requireTitle ?? true;
    if (titleRequired && !form.title.trim()) {
      errors.title = "Completa el titulo";
    }

    const sortOrder = Number(form.sortOrder);
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      errors.sortOrder = "El numero debe ser 0 o mayor";
    } else {
      const repeated = images.some((img) => img.sortOrder === sortOrder && img.id !== options.excludeId);
      if (repeated && !options.allowSortOrderConflict) {
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

  const toFileArray = (files: FileList | null): File[] => (files ? Array.from(files) : []);

  const toTitleFromFileName = (fileName: string): string => {
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "").trim();
    return nameWithoutExtension || "Foto";
  };

  const toDefaultTitles = (files: File[]): string[] => files.map((file) => toTitleFromFileName(file.name));

  const validateMultiTitles = (titles: string[], fileCount: number) => {
    const errors: MultiTitleErrors = {};
    const normalized = titles.slice(0, fileCount).map((title) => title.trim());
    for (let index = 0; index < fileCount; index += 1) {
      if (!normalized[index]) {
        errors[index] = "Completa el titulo";
      }
    }
    return { errors, titles: normalized };
  };

  const nextAvailableSortOrder = (startSortOrder: number, takenSortOrders: Set<number>): number => {
    let candidate = startSortOrder;
    while (takenSortOrders.has(candidate)) {
      candidate += 1;
    }
    takenSortOrders.add(candidate);
    return candidate;
  };

  const findConflictingImage = (sortOrder: number, excludeId?: string): GalleryImageItem | null =>
    images.find((img) => img.sortOrder === sortOrder && img.id !== excludeId) ?? null;

  const buildPayloadFromImage = (image: GalleryImageItem, sortOrder: number) => ({
    title: image.title,
    category: image.category ?? undefined,
    imageUrl: image.imageUrl,
    sortOrder,
    active: image.active,
  });

  const applySingleEdit = async (id: string, payload: GalleryFormPayload, file: File | null, currentImage: GalleryImageItem) => {
    const uploadedUrl = file ? await uploadToCloudinary(file) : currentImage.imageUrl;
    await updateAdminGalleryImage(id, {
      ...payload,
      imageUrl: uploadedUrl,
    });
  };

  const swapSortOrders = async (
    currentImage: GalleryImageItem,
    targetImage: GalleryImageItem,
    payload: GalleryFormPayload,
    file: File | null
  ) => {
    const temporarySortOrder = Math.max(...images.map((img) => img.sortOrder), 0) + 1;
    const updatedUrl = file ? await uploadToCloudinary(file) : currentImage.imageUrl;

    await updateAdminGalleryImage(targetImage.id, buildPayloadFromImage(targetImage, temporarySortOrder));
    await updateAdminGalleryImage(currentImage.id, {
      ...payload,
      imageUrl: updatedUrl,
    });
    await updateAdminGalleryImage(targetImage.id, buildPayloadFromImage(targetImage, currentImage.sortOrder));
  };

  const toggleSelectImage = (id: string, checked: boolean) => {
    setSelectedImageIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedImageIds([]);
      return;
    }
    setSelectedImageIds(images.map((img) => img.id));
  };

  const resetCreateForm = () => {
    setNewForm(emptyForm);
    setNewFiles([]);
    setNewFileTitles([]);
    setNewErrors({});
    setNewMultiTitleErrors({});
  };

  const handleCreate = async () => {
    const selectedFiles = uploadMode === "single" ? newFiles.slice(0, 1) : newFiles;
    const validation = validateForm(newForm, {
      requireFile: true,
      selectedFile: selectedFiles[0] ?? null,
      requireTitle: uploadMode === "single",
      allowSortOrderConflict: uploadMode === "multiple",
    });
    if (!validation.payload) {
      setNewErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    if (uploadMode === "multiple" && selectedFiles.length === 0) {
      setNewErrors((prev) => ({ ...prev, file: "Selecciona una o mas imagenes" }));
      toast.error("Selecciona al menos una imagen");
      return;
    }

    if (uploadMode === "multiple") {
      const titleValidation = validateMultiTitles(newFileTitles, selectedFiles.length);
      if (Object.keys(titleValidation.errors).length > 0) {
        setNewMultiTitleErrors(titleValidation.errors);
        toast.error("Cada foto debe tener titulo");
        return;
      }
    }

    try {
      setCreating(true);
      setUploading(true);
      setNewErrors({});
      setNewMultiTitleErrors({});
      const takenSortOrders = new Set(images.map((img) => img.sortOrder));
      const baseSortOrder = validation.payload.sortOrder;
      const validatedTitles = uploadMode === "multiple"
        ? validateMultiTitles(newFileTitles, selectedFiles.length).titles
        : [];

      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        const uploadedUrl = await uploadToCloudinary(file);
        await createAdminGalleryImage({
          ...validation.payload,
          title: uploadMode === "single" ? validation.payload.title : validatedTitles[index],
          imageUrl: uploadedUrl,
          sortOrder: nextAvailableSortOrder(baseSortOrder + index, takenSortOrders),
        });
      }

      toast.success(selectedFiles.length > 1 ? "Imagenes agregadas" : "Imagen agregada");
      resetCreateForm();
      await fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo agregar la imagen";
      toast.error(message);
    } finally {
      setCreating(false);
      setUploading(false);
    }
  };

  const handleConfirmSortSwap = async () => {
    if (!pendingSortSwap) return;

    const currentImage = images.find((img) => img.id === pendingSortSwap.currentId);
    const targetImage = images.find((img) => img.id === pendingSortSwap.targetId);
    if (!currentImage || !targetImage) {
      setPendingSortSwap(null);
      toast.error("No se pudo completar el intercambio");
      return;
    }

    try {
      setUploading(true);
      await swapSortOrders(currentImage, targetImage, pendingSortSwap.payload, pendingSortSwap.file);

      toast.success("Imagen actualizada. Se intercambiaron los numeros");
      setPendingSortSwap(null);
      setEditingId(null);
      setEditingFile(null);
      setEditingErrors({});
      await fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo intercambiar el numero";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteMode) return;
    const idsToDelete = bulkDeleteMode === "all"
      ? images.map((img) => img.id)
      : selectedImageIds;
    if (idsToDelete.length === 0) {
      setBulkDeleteMode(null);
      return;
    }

    try {
      setBulkDeleting(true);
      for (let index = 0; index < idsToDelete.length; index += 1) {
        await deleteAdminGalleryImage(idsToDelete[index]);
      }
      toast.success(
        idsToDelete.length === 1
          ? "Imagen eliminada"
          : `${idsToDelete.length} imagenes eliminadas`
      );
      setSelectedImageIds([]);
      setBulkDeleteMode(null);
      await fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron eliminar las imagenes";
      toast.error(message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleReorderSubmit = async () => {
    const fromOrder = Number(reorderFrom);
    const toOrder = Number(reorderTo);
    if (
      Number.isNaN(fromOrder) ||
      Number.isNaN(toOrder) ||
      fromOrder < 0 ||
      toOrder < 0
    ) {
      setReorderError("Completa ambos numeros con valores validos (0 o mayor)");
      return;
    }

    if (fromOrder === toOrder) {
      setReorderError("Los numeros deben ser distintos");
      return;
    }

    const fromImage = images.find((img) => img.sortOrder === fromOrder);
    const toImage = images.find((img) => img.sortOrder === toOrder);
    if (!fromImage || !toImage) {
      setReorderError("Uno de los numeros no existe en la galeria");
      return;
    }

    try {
      setUploading(true);
      setReorderError(null);
      await swapSortOrders(
        fromImage,
        toImage,
        {
          title: fromImage.title,
          category: fromImage.category ?? undefined,
          sortOrder: toOrder,
          active: fromImage.active,
        },
        null
      );
      toast.success("Se intercambiaron los numeros de orden");
      setReorderDialogOpen(false);
      setReorderFrom("");
      setReorderTo("");
      await fetchImages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo intercambiar el orden";
      toast.error(message);
    } finally {
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

    const validation = validateForm(editingForm, {
      requireFile: false,
      selectedFile: editingFile,
      excludeId: id,
      allowSortOrderConflict: true,
    });
    if (!validation.payload) {
      setEditingErrors(validation.errors);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    const conflictingImage = findConflictingImage(validation.payload.sortOrder, id);
    if (conflictingImage) {
      setPendingSortSwap({
        currentId: id,
        targetId: conflictingImage.id,
        payload: validation.payload,
        file: editingFile,
      });
      return;
    }

    try {
      setUploading(true);
      setEditingErrors({});
      await applySingleEdit(id, validation.payload, editingFile, currentImage);
      toast.success("Imagen actualizada");
      setEditingId(null);
      setEditingFile(null);
      setEditingErrors({});
      await fetchImages();
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
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={uploadMode === "single" ? "default" : "secondary"}
            onClick={() => {
              setUploadMode("single");
              setNewFiles([]);
              setNewFileTitles([]);
              setNewErrors({});
              setNewMultiTitleErrors({});
            }}
          >
            Una foto
          </Button>
          <Button
            size="sm"
            variant={uploadMode === "multiple" ? "default" : "secondary"}
            onClick={() => {
              setUploadMode("multiple");
              setNewFiles([]);
              setNewFileTitles([]);
              setNewErrors({});
              setNewMultiTitleErrors({});
            }}
          >
            Varias fotos
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {uploadMode === "single" && (
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
          )}
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
              multiple={uploadMode === "multiple"}
              onChange={(e) => {
                const files = toFileArray(e.target.files);
                setNewFiles(files);
                setNewFileTitles(uploadMode === "multiple" ? toDefaultTitles(files) : []);
                setNewErrors((prev) => ({ ...prev, file: undefined }));
                setNewMultiTitleErrors({});
              }}
              className={`max-w-sm ${errorClass(Boolean(newErrors.file))}`}
            />
            {newErrors.file && <p className="text-xs text-destructive">{newErrors.file}</p>}
          </div>
          {newFiles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {newFiles.length === 1
                ? `Archivo seleccionado: ${newFiles[0].name}`
                : `${newFiles.length} archivos seleccionados`}
            </p>
          )}
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
        {uploadMode === "multiple" && newFiles.length > 0 && (
          <div className="space-y-2">
            {newFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="space-y-1">
                <Input
                  placeholder={`Titulo para ${file.name}`}
                  value={newFileTitles[index] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewFileTitles((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    });
                    setNewMultiTitleErrors((prev) => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                  }}
                  className={errorClass(Boolean(newMultiTitleErrors[index]))}
                />
                {newMultiTitleErrors[index] && (
                  <p className="text-xs text-destructive">{newMultiTitleErrors[index]}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleCreate} disabled={creating || uploading}>
          {creating || uploading
            ? "Guardando..."
            : uploadMode === "multiple"
              ? "Agregar imagenes"
              : "Agregar imagen"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2 glass-card rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={toggleSelectAll}>
              {allSelected ? "Quitar seleccion" : "Seleccionar todas"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedImageIds.length === 0 || deleting || bulkDeleting}
              onClick={() => setBulkDeleteMode("selected")}
            >
              Eliminar seleccionadas
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={images.length === 0 || deleting || bulkDeleting}
              onClick={() => setBulkDeleteMode("all")}
            >
              Eliminar todas
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={images.length < 2 || uploading}
              onClick={() => {
                setReorderError(null);
                setReorderDialogOpen(true);
              }}
            >
              Intercambiar numeros
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Seleccionadas: {selectedImageIds.length} de {images.length}
          </p>
        </div>
        {sortedImages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay imagenes cargadas.</p>
        ) : (
          sortedImages.map((item) => {
            const isEditing = editingId === item.id;
            const form = isEditing ? editingForm : null;

            return (
              <div key={item.id} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`gallery-select-${item.id}`}
                    checked={selectedImageIds.includes(item.id)}
                    onCheckedChange={(checked) => toggleSelectImage(item.id, checked === true)}
                  />
                  <label htmlFor={`gallery-select-${item.id}`} className="text-xs text-muted-foreground">
                    Seleccionar
                  </label>
                </div>
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

      <AlertDialog open={Boolean(pendingSortSwap)} onOpenChange={(open) => !open && setPendingSortSwap(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Intercambiar numeros de fotos</AlertDialogTitle>
            <AlertDialogDescription>
              Se detecto que ese numero ya existe.
              {pendingCurrentImage && pendingTargetImage && pendingSortSwap
                ? ` Si continuas, "${pendingCurrentImage.title}" pasara del numero ${pendingCurrentImage.sortOrder} al ${pendingSortSwap.payload.sortOrder}, y "${pendingTargetImage.title}" pasara al numero ${pendingCurrentImage.sortOrder}.`
                : " Si continuas, se intercambiaran los numeros entre ambas fotos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSortSwap} disabled={uploading}>
              {uploading ? "Guardando..." : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(bulkDeleteMode)} onOpenChange={(open) => !open && setBulkDeleteMode(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkDeleteMode === "all" ? "Eliminar toda la galeria" : "Eliminar imagenes seleccionadas"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkDeleteMode === "all"
                ? "Se eliminaran todas las fotos de la galeria."
                : `Se eliminaran ${selectedImageIds.length} fotos seleccionadas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Eliminando..." : "Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Intercambiar orden de fotos</AlertDialogTitle>
            <AlertDialogDescription>
              Cambia dos numeros de orden en un solo paso. Ejemplo: 4 y 9.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              min="0"
              placeholder="Numero actual (ej: 4)"
              value={reorderFrom}
              onChange={(e) => {
                setReorderFrom(e.target.value);
                setReorderError(null);
              }}
            />
            <Input
              type="number"
              min="0"
              placeholder="Nuevo numero (ej: 9)"
              value={reorderTo}
              onChange={(e) => {
                setReorderTo(e.target.value);
                setReorderError(null);
              }}
            />
            {reorderError && <p className="text-xs text-destructive">{reorderError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReorderSubmit} disabled={uploading}>
              {uploading ? "Guardando..." : "Intercambiar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GalleryTab;
