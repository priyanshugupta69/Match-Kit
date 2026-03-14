import Link from "next/link";

const features = [
  {
    num: "01",
    title: "LLM-based extraction",
    desc: "Upload any PDF or DOCX. Claude parses it into typed JSON — skills, experience, education — with confidence scores.",
  },
  {
    num: "02",
    title: "JD parser",
    desc: "Paste a job description. Same pipeline surfaces required vs nice-to-have skills and role seniority.",
  },
  {
    num: "03",
    title: "Semantic matching",
    desc: "Embeddings stored in pgvector. Cosine similarity gives an initial match score.",
  },
  {
    num: "04",
    title: "LLM reranking",
    desc: "Claude refines raw similarity with a nuanced relevance score — reasoning-based cross-encoding.",
  },
  {
    num: "05",
    title: "Skill gap analysis",
    desc: "Every match includes a has/missing skill diff — immediately actionable.",
  },
  {
    num: "06",
    title: "Batch processing",
    desc: "Upload multiple resumes against one JD. Async workers return a ranked leaderboard.",
  },
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#1a3cff] mb-5">
          AI-Powered Resume Matching
        </p>
        <h1 className="text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
          Resume–JD
          <br />
          <span className="text-[#e8440a] italic">Matching</span> Engine
        </h1>
        <p className="text-[#7a7670] text-base leading-7 max-w-lg mb-10">
          Parse resumes and job descriptions with LLMs, match them via semantic
          embeddings and cross-encoder reranking, and get ranked results with
          skill gap analysis.
        </p>
        <div className="flex gap-4">
          <Link
            href="/resumes"
            className="px-5 py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors"
          >
            Upload Resume
          </Link>
          <Link
            href="/job-descriptions"
            className="px-5 py-2.5 border border-[#d8d3c9] text-sm font-medium rounded-lg hover:bg-white transition-colors"
          >
            Add Job Description
          </Link>
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
              <div className="w-9 h-9 rounded-lg bg-[#f5f2ec] border border-[#d8d3c9] flex items-center justify-center font-mono text-xs text-[#1a3cff] font-medium mb-4">
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
