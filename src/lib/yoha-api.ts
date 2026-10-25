export type ApiUser = {
  id: string;
  email: string;
  role: "student" | "admin";
  name: string;
  studentId: string | null;
  faculty: string | null;
  stationId: string | null;
  points: number;
  rewardPoints: number;
  fundPoints: number;
  totalKg: number;
};

export type ApiTransaction = {
  id: string;
  token?: string;
  userId: string | null;
  userName: string | null;
  userFaculty: string | null;
  adminId: string;
  stationId: string;
  collectionPoint: string;
  items: Array<{
    plasticType: string;
    quantity: number;
    cleanliness: string;
    points: number;
  }>;
  totalQuantity: number;
  weightKg: number;
  points: number;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  createdAt: number;
  expiresAt: number;
  confirmedAt: number | null;
};

export type ApiStation = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacityKg: number;
  filledKg: number;
  fillPercent: number;
};

export type ApiCollectionRun = {
  id: string;
  stationId: string;
  collectionPoint: string;
  weightKg: number;
  adminId: string;
  createdAt: number;
};

export type ApiDemoCampaignMetric = {
  label: string;
  kg: number;
};

export type ApiDemoCampaign = {
  registeredStudents: number;
  participantCount: number;
  transactionCount: number;
  totalKg: number;
  totalPoints: number;
  fundraisingPoints: number;
  fundraisingPercent: number;
  byType: ApiDemoCampaignMetric[];
  byQuality: ApiDemoCampaignMetric[];
};

export type ApiLeaderboardRow = {
  userId: string;
  name: string;
  faculty: string;
  points: number;
  kg: number;
};

export type ApiSnapshot = {
  user: ApiUser;
  stations: ApiStation[];
  transactions: ApiTransaction[];
  collectionRuns: ApiCollectionRun[];
  demoCampaign: ApiDemoCampaign | null;
};

export class YohaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "YohaApiError";
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";

export const hasRemoteApi = Boolean(configuredBaseUrl);

export function getApiBaseUrl() {
  return configuredBaseUrl;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: "GET" | "POST"; token?: string; body?: unknown } = {},
): Promise<T> {
  if (!configuredBaseUrl) {
    throw new YohaApiError("Chưa cấu hình VITE_API_BASE_URL", 0);
  }

  const response = await fetch(`${configuredBaseUrl}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string" ? payload.error : "Không thể kết nối máy chủ";
    throw new YohaApiError(message, response.status);
  }
  return payload as T;
}
