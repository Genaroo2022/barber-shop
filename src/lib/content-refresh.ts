const CONTENT_REFRESH_EVENT = "stylebook:content-refresh";
const CONTENT_REFRESH_STORAGE_KEY = "stylebook:content-refresh";

export type ContentResource = "services" | "gallery";

type ContentRefreshPayload = {
  resource: ContentResource;
  timestamp: number;
};

const parsePayload = (raw: string | null): ContentRefreshPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ContentRefreshPayload;
    if (!parsed || (parsed.resource !== "services" && parsed.resource !== "gallery")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const emitContentRefresh = (resource: ContentResource) => {
  if (typeof window === "undefined") return;

  const payload: ContentRefreshPayload = {
    resource,
    timestamp: Date.now(),
  };

  window.dispatchEvent(new CustomEvent<ContentRefreshPayload>(CONTENT_REFRESH_EVENT, { detail: payload }));

  try {
    window.localStorage.setItem(CONTENT_REFRESH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors in private mode or restricted environments.
  }
};

export const subscribeToContentRefresh = (
  resource: ContentResource,
  onRefresh: () => void | Promise<void>
) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<ContentRefreshPayload>).detail;
    if (detail?.resource === resource) {
      void onRefresh();
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CONTENT_REFRESH_STORAGE_KEY) return;
    const payload = parsePayload(event.newValue);
    if (payload?.resource === resource) {
      void onRefresh();
    }
  };

  window.addEventListener(CONTENT_REFRESH_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CONTENT_REFRESH_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
};
