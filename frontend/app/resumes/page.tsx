"use client";

import { useEffect, useRef, useState } from "react";
import {
  listResumes,
  uploadResumes,
  type Resume,
  type BatchUploadResult,
} from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { ParsingProgress } from "@/components/parsing-progress";
import { ContactIcons } from "@/components/contact-icons";

interface ExpEntry {
  title?: string;
  company?: string;
  duration?: string;
}

function ResumeDetails({ resume: r }: { resume: Resume }) {
  const parsed = r.parsed_data as Record<string, unknown> | null;
  const experience =
    parsed?.experience && Array.isArray(parsed.experience)
      ? (parsed.experience as ExpEntry[])
      : [];

  return (
    <div className="px-6 pb-5 border-t border-[#f0ede7]">
      {parsed && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {parsed.name != null && (
            <div>
              <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">Name</p>
              <p className="text-sm font-medium">{String(parsed.name)}</p>
            </div>
          )}
          {parsed.email != null && (
            <div>
              <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">Email</p>
              <p className="text-sm">{String(parsed.email)}</p>
            </div>
          )}
          {parsed.seniority != null && (
            <div>
              <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">Seniority</p>
              <p className="text-sm capitalize">{String(parsed.seniority)}</p>
            </div>
          )}
          {parsed.years_of_experience != null && (
            <div>
              <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">Experience</p>
              <p className="text-sm">{String(parsed.years_of_experience)} years</p>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-2">Skills</p>
        <div className="flex flex-wrap gap-2">
          {r.skills.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-800 border-green-200"
            >
              {s.skill}
              {s.years_exp != null && s.years_exp > 0 && (
                <span className="text-[10px] opacity-60">{s.years_exp}y</span>
              )}
              <span className="text-[10px] opacity-40 font-mono">
                {Math.round(s.confidence * 100)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {experience.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-2">Experience</p>
          <div className="space-y-2">
            {experience.map((exp, i) => (
              <div key={i} className="text-sm flex items-center gap-2">
                <span className="font-medium">{exp.title}</span>
                {exp.company && (
                  <span className="text-[#7a7670]">at {exp.company}</span>
                )}
                {exp.duration && (
                  <span className="font-mono text-xs text-[#7a7670]">({exp.duration})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] font-mono text-[#7a7670]/50">ID: {r.id}</p>
    </div>
  );
}

export default function ResumesPage() {
  return <AuthGuard><ResumesContent /></AuthGuard>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 10;

function ResumesContent() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (opts?: { page?: number; q?: string }) => {
    const targetPage = opts?.page ?? page;
    const targetQ = opts?.q ?? debouncedSearch;
    setLoading(true);
    try {
      const res = await listResumes({
        page: targetPage,
        page_size: PAGE_SIZE,
        q: targetQ || undefined,
      });
      setResumes(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't load your candidates. Please refresh."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    load({ page, q: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setSelectedFiles(Array.from(files));
    setShowModal(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setShowModal(false);
      return next;
    });
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;
    setShowModal(false);
    setUploading(true);
    setError(null);
    try {
      const result: BatchUploadResult = await uploadResumes(selectedFiles);
      if (result.failed.length > 0) {
        const failedNames = result.failed
          .map((f) => `${f.file_name}: ${f.error}`)
          .join("; ");
        setError(`Some files failed: ${failedNames}`);
      }
      if (result.successful.length > 0) {
        setSearch("");
        setDebouncedSearch("");
        if (page === 1) {
          await load({ page: 1, q: "" });
        } else {
          setPage(1);
        }
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Upload didn't go through. Please try again."
      );
    } finally {
      setUploading(false);
      setSelectedFiles([]);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-2">
            Candidates
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Candidates
          </h1>
        </div>
        <label
          className={`px-5 py-2.5 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-[#15522B] transition-colors ${
            uploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {uploading ? "Uploading…" : "Upload Resumes"}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </label>
      </div>

      {showModal && selectedFiles.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-[#f0ede7]">
              <h2 className="text-lg font-semibold">
                Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-[#7a7670] mt-1">
                Review files before uploading
              </p>
            </div>
            <div className="px-6 py-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-[#fafaf8] border border-[#f0ede7] rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-[#7a7670]">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="ml-3 p-1 text-[#7a7670] hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#f0ede7] flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setSelectedFiles([]); }}
                className="px-4 py-2 text-sm font-medium text-[#7a7670] hover:text-[#2c2925] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchUpload}
                className="px-5 py-2 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] transition-colors"
              >
                Upload All
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {uploading && (
        <ParsingProgress
          variant="resume"
          files={selectedFiles.map((f) => f.name)}
        />
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7670]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, file, or skill…"
            className="w-full pl-9 pr-9 py-2 bg-white border border-[#d8d3c9] rounded-lg text-sm placeholder:text-[#7a7670]/60 focus:outline-none focus:border-[#1F6B3A] focus:ring-1 focus:ring-[#1F6B3A]/20 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#7a7670] hover:text-[#2c2925] transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {!loading && (
          <p className="text-xs font-mono text-[#7a7670]">
            {total} {total === 1 ? "candidate" : "candidates"}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#7a7670]">Loading candidates…</div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#d8d3c9] rounded-2xl">
          <p className="text-[#7a7670] mb-2">
            {debouncedSearch ? "No matches" : "No candidates yet"}
          </p>
          <p className="text-sm text-[#7a7670]/60">
            {debouncedSearch
              ? "Try a different search term."
              : "Upload a resume to add your first candidate."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => {
            const parsed = r.parsed_data as Record<string, unknown> | null;
            const email =
              parsed && typeof parsed.email === "string" ? parsed.email : null;
            const phone =
              parsed && typeof parsed.phone === "string" ? parsed.phone : null;
            return (
            <div
              key={r.id}
              className="bg-white border border-[#d8d3c9] rounded-xl overflow-hidden"
            >
              <div className="px-6 py-4 flex items-center gap-3 hover:bg-[#fafaf8] transition-colors">
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f5f2ec] border border-[#d8d3c9] flex items-center justify-center shrink-0">
                    <span className="text-xs font-mono text-[#1F6B3A]">PDF</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.file_name}</p>
                    <p className="text-xs text-[#7a7670]">
                      {new Date(r.uploaded_at).toLocaleDateString()} ·{" "}
                      {r.skills.length} skills extracted
                    </p>
                  </div>
                </button>
                <ContactIcons email={email} phone={phone} />
                {r.overall_confidence != null && (
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-green-50 text-[#1F6B3A]">
                    {Math.round(r.overall_confidence * 100)}% extracted
                  </span>
                )}
                <button
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  aria-label={expanded === r.id ? "Collapse" : "Expand"}
                  className="p-1 text-[#7a7670] hover:text-[#2c2925]"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expanded === r.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {expanded === r.id && <ResumeDetails resume={r} />}
            </div>
            );
          })}
        </div>
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs font-mono text-[#7a7670]">
            Page {page} of {totalPages} · {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium border border-[#d8d3c9] rounded-lg bg-white hover:bg-[#fafaf8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium border border-[#d8d3c9] rounded-lg bg-white hover:bg-[#fafaf8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
