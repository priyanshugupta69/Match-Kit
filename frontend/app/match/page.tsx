"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listResumes,
  listJDs,
  createJD,
  matchSingle,
  matchBatch,
  getMatchHistorySummary,
  getMatchesForRole,
  type Resume,
  type JobDescription,
  type MatchResult,
  type MatchHistoryItem,
  type MatchRoleSummary,
} from "@/lib/api";
import { ScoreRing } from "@/components/score-ring";
import { SkillBadge } from "@/components/skill-badge";
import { AuthGuard } from "@/components/auth-guard";
import { ParsingProgress } from "@/components/parsing-progress";

export default function MatchPage() {
  return (
    <AuthGuard>
      <MatchContent />
    </AuthGuard>
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

function MatchContent() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [summary, setSummary] = useState<MatchRoleSummary[]>([]);
  const [itemsByRole, setItemsByRole] = useState<
    Record<string, MatchHistoryItem[]>
  >({});
  const [loadingRoles, setLoadingRoles] = useState<Set<string>>(new Set());
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("");

  const [showNewMatch, setShowNewMatch] = useState(false);
  const [addCandidatesGroup, setAddCandidatesGroup] =
    useState<HistoryGroup | null>(null);

  const loadInitial = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, j, s] = await Promise.all([
        listResumes(),
        listJDs(),
        getMatchHistorySummary(),
      ]);
      setResumes(r);
      setJds(j);
      setSummary(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "We couldn't load this page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      setSummary(await getMatchHistorySummary());
    } finally {
      setRefreshing(false);
    }
  };

  const loadRoleItems = async (jdId: string) => {
    setLoadingRoles((prev) => new Set(prev).add(jdId));
    setRoleErrors((prev) => {
      const n = { ...prev };
      delete n[jdId];
      return n;
    });
    try {
      const items = await getMatchesForRole(jdId);
      setItemsByRole((prev) => ({ ...prev, [jdId]: items }));
    } catch (e: unknown) {
      setRoleErrors((prev) => ({
        ...prev,
        [jdId]:
          e instanceof Error
            ? e.message
            : "We couldn't load candidates for this role.",
      }));
    } finally {
      setLoadingRoles((prev) => {
        const n = new Set(prev);
        n.delete(jdId);
        return n;
      });
    }
  };

  const toggleGroup = (jdId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(jdId)) {
        next.delete(jdId);
      } else {
        next.add(jdId);
        if (!itemsByRole[jdId] && !loadingRoles.has(jdId)) {
          loadRoleItems(jdId);
        }
      }
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredSummary = useMemo(() => {
    const list = summary.map((s) => ({
      ...s,
      jd_title: s.jd_title || "Untitled role",
    }));
    if (!filter.trim()) return list;
    const q = filter.toLowerCase();
    return list.filter((s) =>
      [s.jd_title, s.jd_company]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [summary, filter]);

  const unmatchedRoles = useMemo(() => {
    const matchedJdIds = new Set(summary.map((s) => s.jd_id));
    return jds.filter((jd) => !matchedJdIds.has(jd.id));
  }, [jds, summary]);

  const totalMatches = useMemo(
    () => summary.reduce((acc, s) => acc + s.match_count, 0),
    [summary]
  );

  if (loading) {
    return <div className="text-center py-20 text-[#7a7670]">Loading…</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a7670] mb-2">
            Matching
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Match Candidates
          </h1>
        </div>
        <button
          onClick={() => setShowNewMatch(true)}
          className="px-5 py-2.5 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] transition-colors flex items-center gap-2"
        >
          <span className="text-base leading-none">+</span> New Match
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {summary.length === 0 && unmatchedRoles.length === 0 ? (
        <EmptyState onNewMatch={() => setShowNewMatch(true)} />
      ) : (
        <>
          {unmatchedRoles.length > 0 && (
            <div className="mb-6 p-4 bg-white border border-dashed border-[#d8d3c9] rounded-2xl">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {unmatchedRoles.length} role
                    {unmatchedRoles.length !== 1 ? "s" : ""} without candidates
                    yet
                  </p>
                  <p className="text-xs text-[#7a7670] mt-0.5 truncate">
                    {unmatchedRoles
                      .map((r) => r.title)
                      .slice(0, 3)
                      .join(", ")}
                    {unmatchedRoles.length > 3
                      ? ` and ${unmatchedRoles.length - 3} more`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewMatch(true)}
                  className="text-xs font-medium text-[#1F6B3A] hover:underline shrink-0"
                >
                  Run first match →
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <p className="text-xs font-mono text-[#7a7670]">
              {totalMatches} match{totalMatches !== 1 ? "es" : ""} across{" "}
              {summary.length} role{summary.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by role or company…"
                className="px-3 py-1.5 text-sm bg-white border border-[#d8d3c9] rounded-lg focus:outline-none focus:border-[#1F6B3A] w-72 max-w-full"
              />
              <button
                onClick={refreshSummary}
                disabled={refreshing}
                className="text-xs font-mono text-[#7a7670] hover:text-[#1F6B3A] disabled:opacity-40"
              >
                {refreshing ? "refreshing…" : "↻ refresh"}
              </button>
            </div>
          </div>

          {filteredSummary.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#d8d3c9] rounded-2xl text-sm text-[#7a7670]">
              No roles match your filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSummary.map((s) => (
                <GroupCard
                  key={s.jd_id}
                  summary={s}
                  isExpanded={expandedGroups.has(s.jd_id)}
                  isLoading={loadingRoles.has(s.jd_id)}
                  loadError={roleErrors[s.jd_id]}
                  items={itemsByRole[s.jd_id]}
                  expandedItems={expandedItems}
                  onToggleGroup={() => toggleGroup(s.jd_id)}
                  onToggleItem={toggleItem}
                  onRetry={() => loadRoleItems(s.jd_id)}
                  onAddCandidates={() => {
                    const items = itemsByRole[s.jd_id] || [];
                    setAddCandidatesGroup({
                      jdId: s.jd_id,
                      jdTitle: s.jd_title || "Untitled role",
                      jdCompany: s.jd_company,
                      items,
                      latest: s.latest_match_at,
                    });
                  }}
                  canAddMore={
                    !!itemsByRole[s.jd_id] &&
                    resumes.some(
                      (r) =>
                        !itemsByRole[s.jd_id]?.find(
                          (it) => it.resume_id === r.id
                        )
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {showNewMatch && (
        <NewMatchModal
          roles={jds}
          candidates={resumes}
          onClose={() => setShowNewMatch(false)}
          onMatched={async (roleId) => {
            // Invalidate cached items for this role; refresh summary.
            setItemsByRole((prev) => {
              const n = { ...prev };
              delete n[roleId];
              return n;
            });
            await refreshSummary();
            // Auto-expand the role that was just matched so the user lands on results.
            setExpandedGroups((prev) => new Set(prev).add(roleId));
            await loadRoleItems(roleId);
            setShowNewMatch(false);
          }}
          onRoleCreated={async (jd) => {
            setJds((prev) => [jd, ...prev]);
          }}
        />
      )}

      {addCandidatesGroup && (
        <AddCandidatesModal
          group={addCandidatesGroup}
          candidates={resumes}
          onClose={() => setAddCandidatesGroup(null)}
          onMatched={async () => {
            const roleId = addCandidatesGroup.jdId;
            await refreshSummary();
            await loadRoleItems(roleId);
            setAddCandidatesGroup(null);
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ onNewMatch }: { onNewMatch: () => void }) {
  return (
    <div className="text-center py-20 border border-dashed border-[#d8d3c9] rounded-2xl">
      <p className="text-[#7a7670] mb-2">No matches yet</p>
      <p className="text-sm text-[#7a7670]/60 mb-6">
        Add a role, pick some candidates, and ResuMatch will rank them for you.
      </p>
      <button
        onClick={onNewMatch}
        className="px-5 py-2.5 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] transition-colors"
      >
        Run your first match
      </button>
    </div>
  );
}

function GroupCard({
  summary,
  isExpanded,
  isLoading,
  loadError,
  items,
  expandedItems,
  onToggleGroup,
  onToggleItem,
  onRetry,
  onAddCandidates,
  canAddMore,
}: {
  summary: MatchRoleSummary;
  isExpanded: boolean;
  isLoading: boolean;
  loadError?: string;
  items?: MatchHistoryItem[];
  expandedItems: Set<string>;
  onToggleGroup: () => void;
  onToggleItem: (id: string) => void;
  onRetry: () => void;
  onAddCandidates: () => void;
  canAddMore: boolean;
}) {
  const title = summary.jd_title || "Untitled role";
  const bestPct =
    summary.best_score != null ? Math.round(summary.best_score * 100) : null;
  const bestColor =
    bestPct != null && bestPct >= 75
      ? "text-[#1F6B3A] bg-green-50 border-green-200"
      : bestPct != null && bestPct >= 50
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="bg-white border border-[#d8d3c9] rounded-2xl overflow-hidden">
      <button
        onClick={onToggleGroup}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#fafaf8] transition-colors text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-1">
            {summary.jd_company || "Role"}
          </p>
          <p className="text-base font-semibold truncate">{title}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {bestPct != null && (
            <span
              className={`font-mono text-xs px-2.5 py-1 rounded-full border ${bestColor}`}
              title="Top candidate score"
            >
              top {bestPct}%
            </span>
          )}
          <div className="text-right">
            <p className="text-xs text-[#7a7670] font-mono">
              {summary.match_count} candidate
              {summary.match_count !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-[#7a7670]/70 font-mono">
              last {formatRelative(summary.latest_match_at)}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-[#7a7670] transition-transform ${
              isExpanded ? "rotate-180" : ""
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

      {isExpanded && (
        <div className="border-t border-[#f0ede7]">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-[#7a7670]">
              <span className="dot-pulse inline-flex">
                <span />
                <span />
                <span />
              </span>
              <span className="ml-2">Loading candidates…</span>
            </div>
          ) : loadError ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-red-700 mb-2">{loadError}</p>
              <button
                onClick={onRetry}
                className="text-xs font-medium text-[#1F6B3A] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : items && items.length > 0 ? (
            <>
              <ul className="divide-y divide-[#f0ede7]">
                {items.map((it, idx) => {
                  const isOpen = expandedItems.has(it.id);
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
                        onClick={() => onToggleItem(it.id)}
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

              <div className="px-5 py-3 border-t border-[#f0ede7] bg-[#fafaf8]/50">
                {canAddMore ? (
                  <button
                    onClick={onAddCandidates}
                    className="text-sm font-medium text-[#1F6B3A] hover:text-[#15522B] flex items-center gap-1.5"
                  >
                    <span className="text-base leading-none">+</span> Add more
                    candidates
                  </button>
                ) : (
                  <p className="text-xs text-[#7a7670] italic">
                    All candidates have been matched against this role.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="px-5 py-6 text-center text-sm text-[#7a7670]">
              No candidates scored against this role yet.
            </div>
          )}
        </div>
      )}
    </div>
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

        {result.final_score != null && (
          <ScoreRing
            score={result.final_score}
            size={88}
            label="Match Score"
          />
        )}

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

// --- Modals ---

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#f0ede7] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-[#7a7670] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#7a7670] hover:text-[#2c2925] p-1"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t border-[#f0ede7] flex justify-end gap-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

function CandidatePicker({
  candidates,
  selected,
  onToggle,
  onSelectAll,
}: {
  candidates: Resume[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-[#d8d3c9] rounded-xl">
        <p className="text-sm text-[#7a7670]">No candidates available</p>
        <p className="text-xs text-[#7a7670]/60 mt-1">
          Upload resumes from the Candidates tab first.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-mono uppercase text-[#7a7670]">
          {candidates.length} available · {selected.size} selected
        </p>
        <button
          onClick={onSelectAll}
          className="text-xs text-[#1F6B3A] hover:underline"
        >
          {selected.size === candidates.length ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {candidates.map((r) => {
          const name =
            (r.parsed_data?.name as string | undefined) || r.file_name;
          return (
            <button
              key={r.id}
              onClick={() => onToggle(r.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm flex items-center gap-3 ${
                selected.has(r.id)
                  ? "border-[#1F6B3A] bg-green-50/50"
                  : "border-[#d8d3c9] hover:bg-[#fafaf8]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selected.has(r.id)
                    ? "border-[#1F6B3A] bg-[#1F6B3A]"
                    : "border-[#d8d3c9]"
                }`}
              >
                {selected.has(r.id) && (
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
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{name}</p>
                <p className="text-xs text-[#7a7670] truncate">
                  {r.file_name} · {r.skills.length} skills
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

async function runMatchApi(
  roleId: string,
  candidateIds: string[]
): Promise<MatchResult[]> {
  if (candidateIds.length === 1) {
    const result = await matchSingle(candidateIds[0], roleId);
    return [result];
  }
  const batch = await matchBatch(roleId, candidateIds);
  return batch.results;
}

function NewMatchModal({
  roles,
  candidates,
  onClose,
  onMatched,
  onRoleCreated,
}: {
  roles: JobDescription[];
  candidates: Resume[];
  onClose: () => void;
  onMatched: (roleId: string) => Promise<void>;
  onRoleCreated: (jd: JobDescription) => Promise<void>;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newRawText, setNewRawText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleCreateRole = async () => {
    if (!newTitle.trim() || !newRawText.trim()) return;
    setSavingRole(true);
    setErr(null);
    try {
      const jd = await createJD({
        title: newTitle.trim(),
        company: newCompany.trim() || undefined,
        raw_text: newRawText.trim(),
      });
      await onRoleCreated(jd);
      setSelectedRoleId(jd.id);
      setCreating(false);
      setNewTitle("");
      setNewCompany("");
      setNewRawText("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "We couldn't save this role.");
    } finally {
      setSavingRole(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectAll = () => {
    if (selected.size === candidates.length) setSelected(new Set());
    else setSelected(new Set(candidates.map((c) => c.id)));
  };

  const handleMatch = async () => {
    if (!selectedRoleId || selected.size === 0) return;
    setMatching(true);
    setErr(null);
    try {
      await runMatchApi(selectedRoleId, Array.from(selected));
      await onMatched(selectedRoleId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Match failed. Please retry.");
      setMatching(false);
    }
  };

  const selectedCandidateNames = candidates
    .filter((c) => selected.has(c.id))
    .map((c) => (c.parsed_data?.name as string | undefined) || c.file_name);

  const subtitle = matching
    ? "Running the match — this usually takes a few seconds."
    : creating
    ? "Add a new role, then pick candidates to match."
    : selectedRoleId
    ? "Pick the candidates you'd like to score against this role."
    : "Pick an existing role or add a new one.";

  return (
    <ModalShell
      title="New Match"
      subtitle={subtitle}
      onClose={onClose}
      footer={
        creating ? (
          <>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 text-sm font-medium text-[#7a7670] hover:text-[#2c2925]"
            >
              Back
            </button>
            <button
              onClick={handleCreateRole}
              disabled={
                savingRole || !newTitle.trim() || !newRawText.trim()
              }
              className="px-5 py-2 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] disabled:opacity-50"
            >
              {savingRole ? "Saving…" : "Save role"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#7a7670] hover:text-[#2c2925]"
            >
              Cancel
            </button>
            <button
              onClick={handleMatch}
              disabled={!selectedRoleId || selected.size === 0 || matching}
              className="px-5 py-2 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] disabled:opacity-50"
            >
              {matching
                ? `Matching ${selected.size} candidate${
                    selected.size !== 1 ? "s" : ""
                  }…`
                : `Match ${selected.size || ""} candidate${
                    selected.size !== 1 ? "s" : ""
                  }`}
            </button>
          </>
        )
      }
    >
      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {err}
        </div>
      )}

      {matching ? (
        <ParsingProgress variant="match" files={selectedCandidateNames} />
      ) : creating ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
                Role Title *
              </label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
                className="w-full px-3 py-2 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1F6B3A] bg-[#f5f2ec]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
                Company
              </label>
              <input
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="w-full px-3 py-2 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1F6B3A] bg-[#f5f2ec]/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
              Role Description *
            </label>
            <textarea
              value={newRawText}
              onChange={(e) => setNewRawText(e.target.value)}
              rows={8}
              placeholder="Paste the role description here…"
              className="w-full px-3 py-2 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1F6B3A] bg-[#f5f2ec]/50 resize-y"
            />
          </div>
          {savingRole && (
            <p className="text-xs text-[#7a7670]">
              Analyzing the role with AI — this takes a few seconds.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono uppercase text-[#7a7670]">
                1. Role
              </p>
              <button
                onClick={() => setCreating(true)}
                className="text-xs font-medium text-[#1F6B3A] hover:underline"
              >
                + Add new role
              </button>
            </div>
            {roles.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[#d8d3c9] rounded-xl">
                <p className="text-sm text-[#7a7670] mb-3">No roles yet</p>
                <button
                  onClick={() => setCreating(true)}
                  className="px-4 py-2 bg-[#1F6B3A] text-white text-xs font-medium rounded-lg hover:bg-[#15522B]"
                >
                  Add your first role
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {roles.map((jd) => (
                  <button
                    key={jd.id}
                    onClick={() => setSelectedRoleId(jd.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors text-sm ${
                      selectedRoleId === jd.id
                        ? "border-[#1F6B3A] bg-green-50/50"
                        : "border-[#d8d3c9] hover:bg-[#fafaf8]"
                    }`}
                  >
                    <span className="font-medium">{jd.title}</span>
                    {jd.company && (
                      <span className="text-[#7a7670] ml-2">
                        at {jd.company}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase text-[#7a7670] mb-2">
              2. Candidates
            </p>
            <CandidatePicker
              candidates={candidates}
              selected={selected}
              onToggle={toggle}
              onSelectAll={selectAll}
            />
          </div>
        </>
      )}
    </ModalShell>
  );
}

function AddCandidatesModal({
  group,
  candidates,
  onClose,
  onMatched,
}: {
  group: HistoryGroup;
  candidates: Resume[];
  onClose: () => void;
  onMatched: () => Promise<void>;
}) {
  const excluded = useMemo(
    () => new Set(group.items.map((i) => i.resume_id)),
    [group]
  );
  const available = useMemo(
    () => candidates.filter((c) => !excluded.has(c.id)),
    [candidates, excluded]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectAll = () => {
    if (selected.size === available.length) setSelected(new Set());
    else setSelected(new Set(available.map((c) => c.id)));
  };

  const handleMatch = async () => {
    if (selected.size === 0) return;
    setMatching(true);
    setErr(null);
    try {
      await runMatchApi(group.jdId, Array.from(selected));
      await onMatched();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Match failed. Please retry.");
      setMatching(false);
    }
  };

  const selectedNames = available
    .filter((c) => selected.has(c.id))
    .map((c) => (c.parsed_data?.name as string | undefined) || c.file_name);

  return (
    <ModalShell
      title={`Add candidates to "${group.jdTitle}"`}
      subtitle={
        matching
          ? "Running the match — this usually takes a few seconds."
          : excluded.size > 0
          ? `${excluded.size} candidate${
              excluded.size !== 1 ? "s" : ""
            } already matched — not shown.`
          : undefined
      }
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={matching}
            className="px-4 py-2 text-sm font-medium text-[#7a7670] hover:text-[#2c2925] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleMatch}
            disabled={selected.size === 0 || matching}
            className="px-5 py-2 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] disabled:opacity-50"
          >
            {matching
              ? `Matching ${selected.size}…`
              : `Match ${selected.size || ""} candidate${
                  selected.size !== 1 ? "s" : ""
                }`}
          </button>
        </>
      }
    >
      {err && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {err}
        </div>
      )}
      {matching ? (
        <ParsingProgress variant="match" files={selectedNames} />
      ) : (
        <CandidatePicker
          candidates={available}
          selected={selected}
          onToggle={toggle}
          onSelectAll={selectAll}
        />
      )}
    </ModalShell>
  );
}
