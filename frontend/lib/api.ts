const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  // Merge any existing headers
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  // Add auth header if token exists (skip for FormData — browser sets content-type)
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Token expired or invalid — clear and redirect
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// --- Auth Types ---
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

// --- Auth ---
export async function register(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  // Store token and user
  localStorage.setItem("token", res.access_token);
  localStorage.setItem("user", JSON.stringify(res.user));
  return res;
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/auth/verify?token=${token}`);
}

export async function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}

// --- Types ---
export interface Skill {
  skill: string;
  years_exp: number | null;
  confidence: number;
}

export interface Resume {
  id: string;
  file_name: string;
  parsed_data: Record<string, unknown> | null;
  overall_confidence: number | null;
  uploaded_at: string;
  skills: Skill[];
}

export interface JDSkill {
  skill: string;
  required: boolean;
  confidence: number;
}

export interface JobDescription {
  id: string;
  title: string;
  company: string | null;
  parsed_data: Record<string, unknown> | null;
  created_at: string;
  skills: JDSkill[];
}

export interface SkillGap {
  skill: string;
  status: "match" | "partial" | "missing";
  required: boolean;
}

export interface MatchResult {
  id: string;
  resume_id: string;
  jd_id: string;
  similarity_score: number | null;
  rerank_score: number | null;
  final_score: number | null;
  skills_matched: string[];
  skills_missing: string[];
  skill_gaps: SkillGap[];
  created_at: string;
}

export interface BatchMatchResponse {
  jd_id: string;
  results: MatchResult[];
  total: number;
}

// --- Resumes ---
export async function uploadResume(file: File): Promise<Resume> {
  const form = new FormData();
  form.append("file", file);
  return request<Resume>("/api/resumes/upload", { method: "POST", body: form });
}

export async function listResumes(): Promise<Resume[]> {
  return request<Resume[]>("/api/resumes/");
}

export async function getResume(id: string): Promise<Resume> {
  return request<Resume>(`/api/resumes/${id}`);
}

// --- Job Descriptions ---
export async function createJD(data: {
  title: string;
  company?: string;
  raw_text: string;
}): Promise<JobDescription> {
  return request<JobDescription>("/api/job-descriptions/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function listJDs(): Promise<JobDescription[]> {
  return request<JobDescription[]>("/api/job-descriptions/");
}

export async function getJD(id: string): Promise<JobDescription> {
  return request<JobDescription>(`/api/job-descriptions/${id}`);
}

// --- Matching ---
export async function matchSingle(
  resumeId: string,
  jdId: string
): Promise<MatchResult> {
  return request<MatchResult>(
    `/api/match/single?resume_id=${resumeId}&jd_id=${jdId}`,
    { method: "POST" }
  );
}

export async function matchBatch(
  jdId: string,
  resumeIds: string[]
): Promise<BatchMatchResponse> {
  return request<BatchMatchResponse>("/api/match/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jd_id: jdId, resume_ids: resumeIds }),
  });
}

export async function getMatchResults(jdId: string): Promise<MatchResult[]> {
  return request<MatchResult[]>(`/api/match/results/${jdId}`);
}
