"use client";

import { useEffect, useState } from "react";
import { createJD, listJDs, type JobDescription } from "@/lib/api";

function JDDetails({ jd }: { jd: JobDescription }) {
  const parsed = jd.parsed_data as Record<string, unknown> | null;
  const niceToHave = jd.skills.filter((s) => !s.required);
  const responsibilities =
    parsed?.responsibilities && Array.isArray(parsed.responsibilities)
      ? (parsed.responsibilities as string[])
      : [];

  return (
    <div className="px-6 pb-5 border-t border-[#f0ede7]">
      {parsed?.seniority != null && (
        <div className="mt-4 mb-3">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">
            Seniority
          </p>
          <p className="text-sm capitalize">{String(parsed.seniority)}</p>
        </div>
      )}

      <div className="mt-3">
        <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-2">
          Required Skills
        </p>
        <div className="flex flex-wrap gap-2">
          {jd.skills
            .filter((s) => s.required)
            .map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200"
              >
                {s.skill}
              </span>
            ))}
        </div>
      </div>

      {niceToHave.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-2">
            Nice to Have
          </p>
          <div className="flex flex-wrap gap-2">
            {niceToHave.map((s, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200"
              >
                {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {responsibilities.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-2">
            Responsibilities
          </p>
          <ul className="space-y-1">
            {responsibilities.map((r, i) => (
              <li key={i} className="text-sm text-[#7a7670] flex gap-2">
                <span className="text-[#d8d3c9]">—</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[10px] font-mono text-[#7a7670]/50">
        ID: {jd.id}
      </p>
    </div>
  );
}

export default function JDPage() {
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [rawText, setRawText] = useState("");

  const load = async () => {
    try {
      setJds(await listJDs());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const jd = await createJD({
        title: title.trim(),
        company: company.trim() || undefined,
        raw_text: rawText.trim(),
      });
      setJds((prev) => [jd, ...prev]);
      setTitle("");
      setCompany("");
      setRawText("");
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-2">
            Job Descriptions
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Job Descriptions
          </h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors"
        >
          {showForm ? "Cancel" : "Add JD"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 bg-white border border-[#d8d3c9] rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
                Job Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
                className="w-full px-3 py-2 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
                Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc"
                className="w-full px-3 py-2 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
              Job Description Text *
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder="Paste the full job description here..."
              className="w-full px-3 py-2 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50 resize-y"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !rawText.trim()}
            className="px-5 py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors disabled:opacity-50"
          >
            {submitting ? "Parsing with Claude..." : "Create & Parse"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#7a7670]">Loading...</div>
      ) : jds.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#d8d3c9] rounded-2xl">
          <p className="text-[#7a7670] mb-2">No job descriptions yet</p>
          <p className="text-sm text-[#7a7670]/60">
            Add a JD to start matching
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jds.map((jd) => (
            <div
              key={jd.id}
              className="bg-white border border-[#d8d3c9] rounded-xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === jd.id ? null : jd.id)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#fafaf8] transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-medium">{jd.title}</p>
                  <p className="text-xs text-[#7a7670]">
                    {jd.company || "No company"} ·{" "}
                    {new Date(jd.created_at).toLocaleDateString()} ·{" "}
                    {jd.skills.length} skills
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-[#7a7670] transition-transform ${
                    expanded === jd.id ? "rotate-180" : ""
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

              {expanded === jd.id && (
                <JDDetails jd={jd} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
