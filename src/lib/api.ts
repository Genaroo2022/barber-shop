import { clearAccessToken, getAccessToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.auth) {
    const token = getAccessToken();
    if (!token) {
      throw new ApiError("No autenticado", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }
    const message = payload?.error || "Error de servidor";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export type ServiceItem = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string | null;
  active: boolean;
};

export type GalleryImageItem = {
  id: string;
  title: string;
  category?: string | null;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

export type AppointmentItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  appointmentAt: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
};

export type ClientSummary = {
  clientName: string;
  clientPhone: string;
  totalAppointments: number;
  lastVisit: string;
};

export type OverviewMetrics = {
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  uniqueClients: number;
  popularService: string;
};

export type IncomeBreakdownItem = {
  serviceName: string;
  count: number;
  total: number;
};

export type IncomeMetrics = {
  registeredIncome: number;
  manualIncome: number;
  totalTips: number;
  totalIncome: number;
  monthlyIncome: number;
  breakdown: IncomeBreakdownItem[];
  manualEntries: ManualIncomeEntry[];
};

export type ManualIncomeEntry = {
  id: string;
  amount: number;
  tipAmount: number;
  total: number;
  occurredOn: string;
  notes?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function listPublicServices(): Promise<ServiceItem[]> {
  return apiRequest<ServiceItem[]>("/api/public/services");
}

export async function createPublicAppointment(payload: {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  appointmentAt: string;
  notes?: string;
}): Promise<AppointmentItem> {
  return apiRequest<AppointmentItem>("/api/public/appointments", {
    method: "POST",
    body: payload,
  });
}

export async function listAdminAppointments(): Promise<AppointmentItem[]> {
  return apiRequest<AppointmentItem[]>("/api/admin/appointments", { auth: true });
}

export async function updateAdminAppointmentStatus(id: string, status: AppointmentItem["status"]): Promise<AppointmentItem> {
  return apiRequest<AppointmentItem>(`/api/admin/appointments/${id}/status`, {
    method: "PATCH",
    body: { status },
    auth: true,
  });
}

export async function listAdminClients(): Promise<ClientSummary[]> {
  return apiRequest<ClientSummary[]>("/api/admin/metrics/clients", { auth: true });
}

export async function getAdminOverview(): Promise<OverviewMetrics> {
  return apiRequest<OverviewMetrics>("/api/admin/metrics/overview", { auth: true });
}

export async function getAdminIncome(): Promise<IncomeMetrics> {
  return apiRequest<IncomeMetrics>("/api/admin/metrics/income", { auth: true });
}

export async function createAdminManualIncome(payload: {
  amount: number;
  tipAmount: number;
  occurredOn: string;
  notes?: string;
}): Promise<ManualIncomeEntry> {
  return apiRequest<ManualIncomeEntry>("/api/admin/metrics/income/manual", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateAdminManualIncome(
  id: string,
  payload: {
    amount: number;
    tipAmount: number;
    occurredOn: string;
    notes?: string;
  }
): Promise<ManualIncomeEntry> {
  return apiRequest<ManualIncomeEntry>(`/api/admin/metrics/income/manual/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteAdminManualIncome(id: string): Promise<void> {
  await apiRequest<null>(`/api/admin/metrics/income/manual/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listAdminServices(): Promise<ServiceItem[]> {
  return apiRequest<ServiceItem[]>("/api/admin/services", { auth: true });
}

export async function createAdminService(payload: {
  name: string;
  price: number;
  durationMinutes: number;
  description?: string;
  active: boolean;
}): Promise<ServiceItem> {
  return apiRequest<ServiceItem>("/api/admin/services", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateAdminService(
  id: string,
  payload: {
    name: string;
    price: number;
    durationMinutes: number;
    description?: string;
    active: boolean;
  }
): Promise<ServiceItem> {
  return apiRequest<ServiceItem>(`/api/admin/services/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteAdminService(id: string): Promise<void> {
  await apiRequest<null>(`/api/admin/services/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listPublicGalleryImages(): Promise<GalleryImageItem[]> {
  return apiRequest<GalleryImageItem[]>("/api/public/gallery");
}

export async function listAdminGalleryImages(): Promise<GalleryImageItem[]> {
  return apiRequest<GalleryImageItem[]>("/api/admin/gallery", { auth: true });
}

export async function createAdminGalleryImage(payload: {
  title: string;
  category?: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
}): Promise<GalleryImageItem> {
  return apiRequest<GalleryImageItem>("/api/admin/gallery", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateAdminGalleryImage(
  id: string,
  payload: {
    title: string;
    category?: string;
    imageUrl: string;
    sortOrder: number;
    active: boolean;
  }
): Promise<GalleryImageItem> {
  return apiRequest<GalleryImageItem>(`/api/admin/gallery/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteAdminGalleryImage(id: string): Promise<void> {
  await apiRequest<null>(`/api/admin/gallery/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
