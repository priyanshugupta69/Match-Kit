"use client";

import { useEffect, useState } from "react";

type Stage = {
  label: string;
  hint: string;
  icon: React.ReactNode;
};

const RESUME_STAGES: Stage[] = [
  {
    label: "Reading the resume",
    hint: "Extracting the document content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" strokeLinejoin="round" />
        <path d="M14 3v6h6" strokeLinejoin="round" />
        <path d="M8 13h8M8 17h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Analyzing with AI",
    hint: "Reviewing skills, experience, and history",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 12l16-8-6 16-2-7-8-1z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Identifying skills",
    hint: "Mapping technologies and proficiency",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2l2.4 5.6L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-1.4z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Understanding experience",
    hint: "Inferring seniority and roles",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinejoin="round" />
        <path d="M3 13h18" />
      </svg>
    ),
  },
  {
    label: "Finalizing",
    hint: "Wrapping up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const JD_STAGES: Stage[] = [
  {
    label: "Reading the role",
    hint: "Reviewing requirements",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 5h16M4 10h16M4 15h10M4 20h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Analyzing with AI",
    hint: "Understanding the role",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 12l16-8-6 16-2-7-8-1z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Extracting required skills",
    hint: "Separating must-have from nice-to-have",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 2l2.4 5.6L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-1.4z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Detecting seniority",
    hint: "Reading the level the role expects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 20h4V10H3zM10 20h4V4h-4zM17 20h4v-7h-4z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Finalizing",
    hint: "Wrapping up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

type Variant = "resume" | "jd";

interface ParsingProgressProps {
  variant: Variant;
  files?: string[];
}

const STAGE_DURATION_MS = 2400;

export function ParsingProgress({ variant, files }: ParsingProgressProps) {
  const stages = variant === "resume" ? RESUME_STAGES : JD_STAGES;
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fileIdx, setFileIdx] = useState(0);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, stages.length - 1));
    }, STAGE_DURATION_MS);
    return () => clearInterval(stageTimer);
  }, [stages.length]);

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!files || files.length <= 1) return;
    const fileTimer = setInterval(() => {
      setFileIdx((i) => (i + 1) % files.length);
    }, 1800);
    return () => clearInterval(fileTimer);
  }, [files]);

  const current = stages[stageIdx];
  const onLastStage = stageIdx === stages.length - 1;
  const activeFile = files && files.length > 0 ? files[fileIdx] : null;

  return (
    <div className="mb-6 bg-white border border-[#d8d3c9] rounded-2xl overflow-hidden">
      <div className="px-6 py-5 flex items-start gap-4 border-b border-[#f0ede7]">
        <div className="relative shrink-0">
          <div className="ai-orb w-10 h-10 rounded-full p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-[#1F6B3A]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  d="M12 3l1.8 4.6L18.4 9.4 14 11.6 12.8 16 12 12.4 8 14l1.6-4L6 8l4.4-.4z"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7a7670]">
              {variant === "resume" ? "Analyzing resume" : "Analyzing role"}
              {files && files.length > 1 ? ` · ${files.length} files` : ""}
            </p>
            <span className="font-mono text-[10px] text-[#7a7670] tabular-nums">
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>
          <p
            key={stageIdx}
            className="step-fade mt-1.5 text-base font-medium shimmer-text"
          >
            {current.label}
            <span className="dot-pulse ml-1 align-middle">
              <span />
              <span />
              <span />
            </span>
          </p>
          <p className="text-xs text-[#7a7670] mt-0.5">
            {activeFile ? (
              <span className="font-mono text-[#1F6B3A]/80">{activeFile}</span>
            ) : (
              current.hint
            )}
          </p>
        </div>
      </div>

      <div className="relative h-1 bg-[#f5f2ec] overflow-hidden">
        <div
          className="absolute inset-y-0 bg-gradient-to-r from-[#1F6B3A] to-[#8BC53F] transition-all duration-700 ease-out"
          style={{
            width: `${((stageIdx + (onLastStage ? 0.6 : 1)) / stages.length) * 100}%`,
          }}
        />
        {onLastStage && (
          <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent progress-sweep" />
        )}
      </div>

      <ul className="px-6 py-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
        {stages.map((s, i) => {
          const done = i < stageIdx;
          const active = i === stageIdx;
          return (
            <li
              key={i}
              className={`flex items-center sm:items-start sm:flex-col gap-2 text-[11px] transition-opacity ${
                done || active ? "opacity-100" : "opacity-40"
              }`}
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                  done
                    ? "bg-[#1F6B3A] border-[#1F6B3A] text-white"
                    : active
                    ? "bg-green-50 border-[#1F6B3A] text-[#1F6B3A]"
                    : "bg-white border-[#d8d3c9] text-[#7a7670]"
                }`}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className={`w-3.5 h-3.5 ${active ? "animate-pulse" : ""}`}>
                    {s.icon}
                  </span>
                )}
              </div>
              <span
                className={`leading-tight ${
                  active ? "text-[#0f0e0d] font-medium" : "text-[#7a7670]"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
