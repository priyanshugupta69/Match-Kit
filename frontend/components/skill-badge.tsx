"use client";

export function SkillBadge({
  status,
  skill,
  required,
}: {
  status: "match" | "partial" | "missing";
  skill: string;
  required?: boolean;
}) {
  const styles = {
    match: "bg-blue-50 text-blue-700 border-blue-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    missing: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "match"
            ? "bg-blue-500"
            : status === "partial"
            ? "bg-amber-500"
            : "bg-red-400"
        }`}
      />
      {skill}
      {required === false && (
        <span className="text-[10px] opacity-60">nice-to-have</span>
      )}
    </span>
  );
}
