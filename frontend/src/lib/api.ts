import type { AnalysisResponse, AssessmentInput, ChildProfile } from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000/api";

export type HealthPayload = {
  ok: boolean;
  app: string;
  rag_ready: boolean;
  ollama_reachable: boolean;
};

export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: "parent" | "asha_worker" | "ngo_staff";
  asha_worker_id?: string | null;
  state?: string | null;
  language_preference?: "en" | "hi";
};

export type AuthPayload = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: AuthUser;
};

async function parseError(response: Response): Promise<Error> {
  const text = await response.text();
  try {
    const payload = JSON.parse(text) as { detail?: string };
    return new Error(payload.detail || "Request failed");
  } catch {
    return new Error(text || "Request failed");
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("nutriforge-refresh-token");
  if (!refresh) return null;
  if (!refreshInFlight) {
    refreshInFlight = refreshToken(refresh)
      .then((session) => {
        localStorage.setItem("nutriforge-access-token", session.access_token);
        localStorage.setItem("nutriforge-refresh-token", session.refresh_token);
        localStorage.setItem(
          "nutriforge-session",
          JSON.stringify({
            id: session.user.id,
            name: session.user.full_name,
            email: session.user.email,
            role: session.user.role,
            ashaWorkerId: session.user.asha_worker_id,
            state: session.user.state,
            languagePreference: session.user.language_preference ?? "en",
          }),
        );
        return session.access_token;
      })
      .catch(() => {
        localStorage.removeItem("nutriforge-access-token");
        localStorage.removeItem("nutriforge-refresh-token");
        localStorage.removeItem("nutriforge-session");
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, accessToken?: string | null, retry = true): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, init, refreshed, false);
    }
  }
  if (!response.ok) {
    throw await parseError(response);
  }
  return (await response.json()) as T;
}

export async function getBackendHealth(): Promise<(HealthPayload & { base: string }) | null> {
  try {
    const data = await apiRequest<HealthPayload>("/health");
    return { ...data, base: API_BASE };
  } catch {
    return null;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function analyzeChild(payload: ChildProfile, photo?: File | null): Promise<AnalysisResponse> {
  const requestBody: AssessmentInput = {
    child_name: payload.name ?? null,
    age_months: payload.age_months,
    sex: payload.sex,
    height_cm: payload.height_cm,
    weight_kg: payload.weight_kg,
    muac_mm: payload.muac_mm ?? null,
    state: payload.state,
    region: (payload.region?.toLowerCase() as AssessmentInput["region"]) || "rural block",
    budget_inr: payload.household_budget_inr ?? 50,
    notes: payload.symptoms ?? null,
    photo_base64: photo ? await fileToBase64(photo) : null,
    language: "en",
  };
  return apiRequest<AnalysisResponse>(
    "/v1/assess",
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    },
    localStorage.getItem("nutriforge-access-token"),
  );
}

export async function signup(payload: {
  full_name: string;
  email: string;
  password: string;
  role: "parent" | "asha_worker" | "ngo_staff";
  asha_worker_id?: string | null;
}): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/v1/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

export async function signin(payload: { email: string; password: string }): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/v1/auth/signin", { method: "POST", body: JSON.stringify(payload) });
}

export async function refreshToken(refresh_token: string): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/v1/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token }) });
}

export async function signout(refresh_token: string): Promise<void> {
  await apiRequest<{ status: string }>("/v1/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token }) });
}

export async function getMyAssessments(accessToken: string): Promise<{ id: string; created_at: string; result: AnalysisResponse }[]> {
  return apiRequest<{ id: string; created_at: string; result: AnalysisResponse }[]>("/v1/assessments", {}, accessToken);
}
