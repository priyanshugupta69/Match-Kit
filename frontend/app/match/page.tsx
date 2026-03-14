"use client";

import { useEffect, useState } from "react";
import {
  listResumes,
  listJDs,
  matchSingle,
  matchBatch,
  type Resume,
  type JobDescription,
  type MatchResult,
} from "@/lib/api";
import { ScoreRing } from "@/components/score-ring";
import { SkillBadge } from "@/components/skill-badge";
import { AuthGuard } from "@/components/auth-guard";

export default function MatchPage() {
  return <AuthGuard><MatchContent /></AuthGuard>;
}

function MatchContent() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJD, setSelectedJD] = useState("");
  const [selectedResumes, setSelectedResumes] = useState<Set<string>>(
    new Set()
  );
  const [matching, setMatching] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listResumes(), listJDs()])
      .then(([r, j]) => {
        setResumes(r);
        setJds(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleResume = (id: string) => {
    setSelectedResumes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedResumes.size === resumes.length) {
      setSelectedResumes(new Set());
    } else {
      setSelectedResumes(new Set(resumes.map((r) => r.id)));
    }
  };

  const handleMatch = async () => {
    if (!selectedJD || selectedResumes.size === 0) return;
    setMatching(true);
    setError(null);
    setResults([]);

    try {
      const ids = Array.from(selectedResumes);
      if (ids.length === 1) {
        const result = await matchSingle(ids[0], selectedJD);
        setResults([result]);
      } else {
        const batch = await matchBatch(selectedJD, ids);
        setResults(batch.results);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setMatching(false);
    }
  };

  const getResumeName = (id: string) => {
    const r = resumes.find((r) => r.id === id);
    return r?.parsed_data?.name
      ? String(r.parsed_data.name)
      : r?.file_name || id;
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-[#7a7670]">Loading...</div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-2">
          Matching
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Match Resumes to JD
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Select JD */}
        <div className="bg-white border border-[#d8d3c9] rounded-xl p-5">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-3">
            1. Select Job Description
          </p>
          {jds.length === 0 ? (
            <p className="text-sm text-[#7a7670]">
              No JDs found. Add one first.
            </p>
          ) : (
            <div className="space-y-2">
              {jds.map((jd) => (
                <button
                  key={jd.id}
                  onClick={() => setSelectedJD(jd.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                    selectedJD === jd.id
                      ? "border-[#1a3cff] bg-blue-50/50"
                      : "border-[#d8d3c9] hover:bg-[#fafaf8]"
                  }`}
                >
                  <span className="font-medium">{jd.title}</span>
                  {jd.company && (
                    <span className="text-[#7a7670] ml-2">
                      at {jd.company}
                    </span>
                  )}
                  <span className="text-xs text-[#7a7670] ml-2">
                    ({jd.skills.length} skills)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Select Resumes */}
        <div className="bg-white border border-[#d8d3c9] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono uppercase text-[#7a7670]">
              2. Select Resumes
            </p>
            {resumes.length > 0 && (
              <button
                onClick={selectAll}
                className="text-xs text-[#1a3cff] hover:underline"
              >
                {selectedResumes.size === resumes.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            )}
          </div>
          {resumes.length === 0 ? (
            <p className="text-sm text-[#7a7670]">
              No resumes found. Upload one first.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => toggleResume(r.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm flex items-center gap-3 ${
                    selectedResumes.has(r.id)
                      ? "border-[#1a3cff] bg-blue-50/50"
                      : "border-[#d8d3c9] hover:bg-[#fafaf8]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedResumes.has(r.id)
                        ? "border-[#1a3cff] bg-[#1a3cff]"
                        : "border-[#d8d3c9]"
                    }`}
                  >
                    {selectedResumes.has(r.id) && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">{r.file_name}</span>
                    <span className="text-xs text-[#7a7670] ml-2">
                      {r.skills.length} skills
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Match button */}
      <div className="flex justify-center mb-10">
        <button
          onClick={handleMatch}
          disabled={!selectedJD || selectedResumes.size === 0 || matching}
          className="px-8 py-3 bg-[#1a3cff] text-white text-sm font-medium rounded-xl hover:bg-[#1530cc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {matching
            ? `Matching ${selectedResumes.size} resume${selectedResumes.size > 1 ? "s" : ""}...`
            : `Match ${selectedResumes.size} resume${selectedResumes.size !== 1 ? "s" : ""} against JD`}
        </button>
      </div>

      {matching && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm text-center">
          Running similarity search, LLM reranking, and skill gap analysis...
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-4">
            Match Results — Ranked by Score
          </p>
          <div className="space-y-4">
            {results.map((r, rank) => (
              <div
                key={r.id}
                className="bg-white border border-[#d8d3c9] rounded-xl p-6"
              >
                <div className="flex items-start gap-6">
                  {/* Rank */}
                  <div className="text-center">
                    <span className="font-mono text-2xl text-[#d8d3c9] font-medium">
                      #{rank + 1}
                    </span>
                  </div>

                  {/* Score rings */}
                  <div className="flex gap-4">
                    {r.final_score != null && (
                      <ScoreRing
                        score={r.final_score}
                        size={72}
                        label="final"
                      />
                    )}
                    {r.similarity_score != null && (
                      <ScoreRing
                        score={r.similarity_score}
                        size={56}
                        label="similarity"
                      />
                    )}
                    {r.rerank_score != null && (
                      <ScoreRing
                        score={r.rerank_score}
                        size={56}
                        label="rerank"
                      />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold mb-1">
                      {getResumeName(r.resume_id)}
                    </p>
                    <p className="text-xs text-[#7a7670] mb-4 font-mono">
                      {r.skills_matched.length} matched ·{" "}
                      {r.skills_missing.length} missing
                    </p>

                    {/* Skill gaps */}
                    {r.skill_gaps.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {r.skill_gaps.map((g, i) => (
                          <SkillBadge
                            key={i}
                            skill={g.skill}
                            status={g.status}
                            required={g.required}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {r.skills_matched.map((s, i) => (
                          <SkillBadge
                            key={`m-${i}`}
                            skill={s}
                            status="match"
                          />
                        ))}
                        {r.skills_missing.map((s, i) => (
                          <SkillBadge
                            key={`x-${i}`}
                            skill={s}
                            status="missing"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
