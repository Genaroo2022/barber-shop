import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { listPublicGalleryImages, type GalleryImageItem } from "@/lib/api";
import { subscribeToContentRefresh } from "@/lib/content-refresh";

type VisualGalleryItem = {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
};

type GalleryCachePayload = {
  version: 1;
  savedAt: number;
  data: GalleryImageItem[];
};

const GALLERY_CACHE_KEY = "stylebook:public-gallery:v1";

const fallbackGallery: VisualGalleryItem[] = [
  { id: "fallback-1", title: "Fade cl\u00e1sico", category: "Corte" },
  { id: "fallback-2", title: "Pompadour moderno", category: "Corte" },
  { id: "fallback-3", title: "Barba definida", category: "Barba" },
  { id: "fallback-4", title: "Undercut", category: "Corte" },
  { id: "fallback-5", title: "Degrad\u00e9 + dise\u00f1o", category: "Corte" },
  { id: "fallback-6", title: "Barba full", category: "Barba" },
];

const isValidGalleryItemArray = (value: unknown): value is GalleryImageItem[] => {
  if (!Array.isArray(value)) return false;
  return value.every((item) =>
    typeof item === "object" &&
    item !== null &&
    typeof (item as GalleryImageItem).id === "string" &&
    typeof (item as GalleryImageItem).title === "string" &&
    typeof (item as GalleryImageItem).imageUrl === "string" &&
    typeof (item as GalleryImageItem).sortOrder === "number" &&
    typeof (item as GalleryImageItem).active === "boolean"
  );
};

const readCachedGallery = (): GalleryImageItem[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GALLERY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GalleryCachePayload;
    if (!parsed || parsed.version !== 1 || !isValidGalleryItemArray(parsed.data)) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCachedGallery = (images: GalleryImageItem[]) => {
  if (typeof window === "undefined") return;
  const payload: GalleryCachePayload = {
    version: 1,
    savedAt: Date.now(),
    data: images,
  };
  try {
    window.localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota/private mode errors.
  }
};

const Gallery = () => {
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const requestRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  const fetchGallery = useCallback(async (showFallbackOnError: boolean) => {
    requestRef.current?.abort();
    const requestController = new AbortController();
    requestRef.current = requestController;
    const requestSequence = ++requestSequenceRef.current;

    try {
      const data = await listPublicGalleryImages(requestController.signal);
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }
      setImages(data);
      writeCachedGallery(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (!showFallbackOnError) return;
      setImages([]);
    }
  }, []);

  useEffect(() => {
    const cachedGallery = readCachedGallery();
    if (cachedGallery) {
      setImages(cachedGallery);
    }
    void fetchGallery(!cachedGallery);
  }, [fetchGallery]);

  useEffect(() => {
    const unsubscribe = subscribeToContentRefresh("gallery", () => fetchGallery(false));
    return unsubscribe;
  }, [fetchGallery]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    []
  );

  const items: VisualGalleryItem[] =
    images.length > 0
      ? images.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category?.trim() || "Corte",
          imageUrl: item.imageUrl,
        }))
      : fallbackGallery;

  return (
    <section className="py-24 relative">
      <div className="container px-4 sm:px-6">
        <motion.div
          id="gallery"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">Galer\u00eda</p>
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Nuestros <span className="gold-text">trabajos</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="aspect-square glass-card rounded-xl overflow-hidden group cursor-pointer relative"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary/50">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                  <span className="text-muted-foreground/50 text-xs">Foto pr\u00f3ximamente</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <div>
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">{item.category}</p>
                  <p className="font-display font-semibold">{item.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {images.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            Pr\u00f3ximamente, fotos reales de nuestros trabajos
          </p>
        )}
      </div>
    </section>
  );
};

export default Gallery;
