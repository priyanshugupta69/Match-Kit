"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listResumes,
  listJDs,
  matchSingle,
  matchBatch,
  getMatchHistory,
  type Resume,
  type JobDescription,
  type MatchResult,
  type MatchHistoryItem,
} from "@/lib/api";
import { ScoreRing } from "@/components/score-ring";
import { SkillBadge } from "@/components/skill-badge";
import { AuthGuard } from "@/components/auth-guard";

type Tab = "new" | "history";

export default function MatchPage() {
  return (
    <AuthGuard>
      <MatchContent />
    </AuthGuard>
  );
}

function MatchContent() {
  const [tab, setTab] = useState<Tab>("new");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJD, setSelectedJD] = useState("");
  const [selectedResumes, setSelectedResumes] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listResumes(), listJDs()])
      .then(([r, j]) => {
        setResumes(r);
        setJds(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await getMatchHistory());
    } catch (e: unknown) {
      setHistoryError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "history" && history.length === 0 && !historyLoading) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
      // Invalidate cached history so the next visit refetches.
      setHistory([]);
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
    return <div className="text-center py-20 text-[#7a7670]">Loading...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-2">
          Matching
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Match Engine</h1>
      </div>

      <div className="mb-8 flex items-center gap-1 border-b border-[#d8d3c9]">
        <TabButton
          active={tab === "new"}
          onClick={() => setTab("new")}
          label="New Match"
        />
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          label="History"
          count={history.length}
        />
        {tab === "history" && (
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="ml-auto mb-2 text-xs font-mono text-[#7a7670] hover:text-[#1F6B3A] disabled:opacity-40"
          >
            {historyLoading ? "refreshing…" : "↻ refresh"}
          </button>
        )}
      </div>

      {tab === "new" ? (
        <NewMatchView
          jds={jds}
          resumes={resumes}
          selectedJD={selectedJD}
          setSelectedJD={setSelectedJD}
          selectedResumes={selectedResumes}
          toggleResume={toggleResume}
          selectAll={selectAll}
          matching={matching}
          results={results}
          error={error}
          handleMatch={handleMatch}
          getResumeName={getResumeName}
        />
      ) : (
        <HistoryView
          items={history}
          loading={historyLoading}
          error={historyError}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "text-[#1F6B3A]" : "text-[#7a7670] hover:text-[#2c2925]"
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#f5f2ec] text-[#7a7670]">
          {count}
        </span>
      )}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#1F6B3A]" />
      )}
    </button>
  );
}

interface NewMatchViewProps {
  jds: JobDescription[];
  resumes: Resume[];
  selectedJD: string;
  setSelectedJD: (id: string) => void;
  selectedResumes: Set<string>;
  toggleResume: (id: string) => void;
  selectAll: () => void;
  matching: boolean;
  results: MatchResult[];
  error: string | null;
  handleMatch: () => void;
  getResumeName: (id: string) => string;
}

function NewMatchView({
  jds,
  resumes,
  selectedJD,
  setSelectedJD,
  selectedResumes,
  toggleResume,
  selectAll,
  matching,
  results,
  error,
  handleMatch,
  getResumeName,
}: NewMatchViewProps) {
  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-[#d8d3c9] rounded-xl p-5">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-3">
            1. Select Job Description
          </p>
          {jds.length === 0 ? (
            <p className="text-sm text-[#7a7670]">No JDs found. Add one first.</p>
          ) : (
            <div className="space-y-2">
              {jds.map((jd) => (
                <button
                  key={jd.id}
                  onClick={() => setSelectedJD(jd.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                    selectedJD === jd.id
                      ? "border-[#1F6B3A] bg-green-50/50"
                      : "border-[#d8d3c9] hover:bg-[#fafaf8]"
                  }`}
                >
                  <span className="font-medium">{jd.title}</span>
                  {jd.company && (
                    <span className="text-[#7a7670] ml-2">at {jd.company}</span>
                  )}
                  <span className="text-xs text-[#7a7670] ml-2">
                    ({jd.skills.length} skills)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#d8d3c9] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono uppercase text-[#7a7670]">
              2. Select Resumes
            </p>
            {resumes.length > 0 && (
              <button
                onClick={selectAll}
                className="text-xs text-[#1F6B3A] hover:underline"
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
                      ? "border-[#1F6B3A] bg-green-50/50"
                      : "border-[#d8d3c9] hover:bg-[#fafaf8]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedResumes.has(r.id)
                        ? "border-[#1F6B3A] bg-[#1F6B3A]"
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

      <div className="flex justify-center mb-10">
        <button
          onClick={handleMatch}
          disabled={!selectedJD || selectedResumes.size === 0 || matching}
          className="px-8 py-3 bg-[#1F6B3A] text-white text-sm font-medium rounded-xl hover:bg-[#15522B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {matching
            ? `Matching ${selectedResumes.size} resume${
                selectedResumes.size > 1 ? "s" : ""
              }...`
            : `Match ${selectedResumes.size} resume${
                selectedResumes.size !== 1 ? "s" : ""
              } against JD`}
        </button>
      </div>

      {matching && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm text-center">
          Running similarity search, LLM reranking, and skill gap analysis...
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-4">
            Match Results — Ranked by Score
          </p>
          <div className="space-y-4">
            {results.map((r, rank) => (
              <MatchCard
                key={r.id}
                result={r}
                rank={rank}
                title={getResumeName(r.resume_id)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MatchCard({
  result,
  rank,
  title,
  subtitle,
}: {
  result: MatchResult;
  rank?: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white border border-[#d8d3c9] rounded-xl p-6">
      <div className="flex items-start gap-6">
        {rank != null && (
          <div className="text-center">
            <span className="font-mono text-2xl text-[#d8d3c9] font-medium">
              #{rank + 1}
            </span>
          </div>
        )}

        <div className="flex gap-4">
          {result.final_score != null && (
            <ScoreRing score={result.final_score} size={72} label="final" />
          )}
          {result.similarity_score != null && (
            <ScoreRing
              score={result.similarity_score}
              size={56}
              label="similarity"
            />
          )}
          {result.rerank_score != null && (
            <ScoreRing score={result.rerank_score} size={56} label="rerank" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold mb-1">{title}</p>
          {subtitle && (
            <p className="text-xs text-[#7a7670] mb-1">{subtitle}</p>
          )}
          <p className="text-xs text-[#7a7670] mb-4 font-mono">
            {result.skills_matched.length} matched ·{" "}
            {result.skills_missing.length} missing
          </p>

          {result.skill_gaps.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.skill_gaps.map((g, i) => (
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
              {result.skills_matched.map((s, i) => (
                <SkillBadge key={`m-${i}`} skill={s} status="match" />
              ))}
              {result.skills_missing.map((s, i) => (
                <SkillBadge key={`x-${i}`} skill={s} status="missing" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HistoryGroup {
  jdId: string;
  jdTitle: string;
  jdCompany: string | null;
  items: MatchHistoryItem[];
  latest: string;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function HistoryView({
  items,
  loading,
  error,
}: {
  items: MatchHistoryItem[];
  loading: boolean;
  error: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter.trim()) return items;
    const q = filter.toLowerCase();
    return items.filter((it) =>
      [
        it.jd_title,
        it.jd_company,
        it.resume_file_name,
        it.resume_candidate_name,
      ]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [items, filter]);

  const groups: HistoryGroup[] = useMemo(() => {
    const map = new Map<string, HistoryGroup>();
    for (const it of filtered) {
      const g = map.get(it.jd_id);
      if (g) {
        g.items.push(it);
        if (it.created_at > g.latest) g.latest = it.created_at;
      } else {
        map.set(it.jd_id, {
          jdId: it.jd_id,
          jdTitle: it.jd_title || "Untitled JD",
          jdCompany: it.jd_company,
          items: [it],
          latest: it.created_at,
        });
      }
    }
    return Array.from(map.values())
      .map((g) => {
        g.items.sort(
          (a, b) => (b.final_score || 0) - (a.final_score || 0)
        );
        return g;
      })
      .sort((a, b) => (a.latest > b.latest ? -1 : 1));
  }, [filtered]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-[#7a7670]">Loading history...</div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-[#d8d3c9] rounded-2xl">
        <p className="text-[#7a7670] mb-2">No matches run yet</p>
        <p className="text-sm text-[#7a7670]/60">
          Run a match from the New Match tab — results are stored automatically.
        </p>
      </div>
    );
  }

  const totalShown = filtered.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <p className="text-xs font-mono text-[#7a7670]">
          {totalShown} match{totalShown !== 1 ? "es" : ""} across {groups.length} JD
          {groups.length !== 1 ? "s" : ""}
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by JD, company, or candidate..."
          className="px-3 py-1.5 text-sm bg-white border border-[#d8d3c9] rounded-lg focus:outline-none focus:border-[#1F6B3A] w-72 max-w-full"
        />
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div
            key={g.jdId}
            className="bg-white border border-[#d8d3c9] rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#f0ede7] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">
                  {g.jdCompany ? g.jdCompany : "JD"}
                </p>
                <p className="text-base font-semibold truncate">{g.jdTitle}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#7a7670] font-mono">
                  {g.items.length} run{g.items.length !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-[#7a7670]/70 font-mono">
                  last {formatRelative(g.latest)}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-[#f0ede7]">
              {g.items.map((it, idx) => {
                const isOpen = expanded.has(it.id);
                const candidate =
                  it.resume_candidate_name ||
                  it.resume_file_name ||
                  it.resume_id.slice(0, 8);
                const finalPct =
                  it.final_score != null
                    ? Math.round(it.final_score * 100)
                    : null;
                const scoreColor =
                  finalPct != null && finalPct >= 75
                    ? "text-[#1F6B3A] bg-green-50 border-green-200"
                    : finalPct != null && finalPct >= 50
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : "text-red-700 bg-red-50 border-red-200";

                return (
                  <li key={it.id}>
                    <button
                      onClick={() => toggle(it.id)}
                      className="w-full px-5 py-3 flex items-center gap-4 hover:bg-[#fafaf8] transition-colors text-left"
                    >
                      <span className="font-mono text-xs text-[#d8d3c9] w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {candidate}
                        </p>
                        <p className="text-[11px] text-[#7a7670] font-mono">
                          {it.skills_matched.length} matched ·{" "}
                          {it.skills_missing.length} missing ·{" "}
                          {formatRelative(it.created_at)}
                        </p>
                      </div>
                      {finalPct != null && (
                        <span
                          className={`font-mono text-xs px-2.5 py-1 rounded-full border ${scoreColor}`}
                        >
                          {finalPct}%
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-[#7a7670] transition-transform shrink-0 ${
                          isOpen ? "rotate-180" : ""
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
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 bg-[#fafaf8]">
                        <MatchCard
                          result={it}
                          title={candidate}
                          subtitle={
                            it.resume_file_name &&
                            it.resume_candidate_name &&
                            it.resume_file_name !== it.resume_candidate_name
                              ? it.resume_file_name
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
