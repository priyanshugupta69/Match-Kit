"use client";

import Link from "next/link";
import { isLoggedIn } from "@/lib/api";
import { useEffect, useState } from "react";

const features = [
  {
    num: "01",
    title: "Smart resume parsing",
    desc: "Drop in any resume. We pull out skills, experience, and seniority automatically, with a confidence read on each.",
  },
  {
    num: "02",
    title: "Role intake",
    desc: "Paste a job description. We surface must-have vs. nice-to-have skills and the seniority level it expects.",
  },
  {
    num: "03",
    title: "Instant matching",
    desc: "Every resume is scored against the role in seconds. No manual keyword tagging.",
  },
  {
    num: "04",
    title: "AI-refined ranking",
    desc: "Beyond keyword overlap — we re-score candidates against the full context of the role for an accurate fit.",
  },
  {
    num: "05",
    title: "Skill-gap analysis",
    desc: "Every match shows exactly which required skills the candidate has and which are missing. Recruiter-ready feedback.",
  },
  {
    num: "06",
    title: "Batch ranking",
    desc: "Upload a stack of resumes against a single role and get a ranked shortlist.",
  },
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#1F6B3A] mb-5">
          AI-Powered Resume Matching
        </p>
        <h1 className="text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
          Find the right
          <br />
          <span className="text-[#8BC53F] italic">candidate</span>, instantly.
        </h1>
        <p className="text-[#7a7670] text-base leading-7 max-w-lg mb-10">
          Upload resumes, paste a role description, and get ranked candidates
          with a clear skill-gap breakdown — no spreadsheets, no manual triage.
        </p>
        <div className="flex gap-4">
          {mounted && loggedIn ? (
            <>
              <Link
                href="/resumes"
                className="px-5 py-2.5 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] transition-colors"
              >
                Upload Resume
              </Link>
              <Link
                href="/job-descriptions"
                className="px-5 py-2.5 border border-[#d8d3c9] text-sm font-medium rounded-lg hover:bg-white transition-colors"
              >
                Add Role
              </Link>
            </>
          ) : mounted ? (
            <>
              <Link
                href="/register"
                className="px-5 py-2.5 bg-[#1F6B3A] text-white text-sm font-medium rounded-lg hover:bg-[#15522B] transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 border border-[#d8d3c9] text-sm font-medium rounded-lg hover:bg-white transition-colors"
              >
                Log in
              </Link>
            </>
          ) : null}
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#d8d3c9] border border-[#d8d3c9] rounded-2xl overflow-hidden">
          {features.map((f) => (
            <div
              key={f.num}
              className="bg-white p-7 hover:bg-[#fafaf8] transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-[#f5f2ec] border border-[#d8d3c9] flex items-center justify-center font-mono text-xs text-[#1F6B3A] font-medium mb-4">
                {f.num}
              </div>
              <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
              <p className="text-[13px] text-[#7a7670] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
