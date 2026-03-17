"use client";

import { useEffect, useRef, useState } from "react";
import {
  listResumes,
  uploadResume,
  uploadResumes,
  type Resume,
  type BatchUploadResult,
} from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";

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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200"
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

function ResumesContent() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showModal, setShowModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setResumes(await listResumes());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
      if (selectedFiles.length === 1) {
        const resume = await uploadResume(selectedFiles[0]);
        setResumes((prev) => [resume, ...prev]);
      } else {
        const result: BatchUploadResult = await uploadResumes(selectedFiles);
        if (result.successful.length > 0) {
          setResumes((prev) => [...result.successful, ...prev]);
        }
        if (result.failed.length > 0) {
          const failedNames = result.failed
            .map((f) => `${f.file_name}: ${f.error}`)
            .join("; ");
          setError(`Some files failed: ${failedNames}`);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
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
            Resumes
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Uploaded Resumes
          </h1>
        </div>
        <label
          className={`px-5 py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-[#1530cc] transition-colors ${
            uploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {uploading ? "Processing..." : "Upload Resumes"}
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
                className="px-5 py-2 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors"
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
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
          Uploading and parsing resume(s) with Claude... This may take a moment.
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#7a7670]">Loading...</div>
      ) : resumes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#d8d3c9] rounded-2xl">
          <p className="text-[#7a7670] mb-2">No resumes uploaded yet</p>
          <p className="text-sm text-[#7a7670]/60">
            Upload a PDF or DOCX to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-[#d8d3c9] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#fafaf8] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#f5f2ec] border border-[#d8d3c9] flex items-center justify-center">
                    <span className="text-xs font-mono text-[#1a3cff]">
                      PDF
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{r.file_name}</p>
                    <p className="text-xs text-[#7a7670]">
                      {new Date(r.uploaded_at).toLocaleDateString()} ·{" "}
                      {r.skills.length} skills extracted
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.overall_confidence != null && (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-50 text-[#1a3cff]">
                      {Math.round(r.overall_confidence * 100)}% confidence
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-[#7a7670] transition-transform ${
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
                </div>
              </button>

              {expanded === r.id && <ResumeDetails resume={r} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
