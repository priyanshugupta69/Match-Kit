const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
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
