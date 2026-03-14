"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white border border-[#d8d3c9] rounded-2xl p-8 max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm text-[#7a7670]">
            Log in to ResuMatch
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#7a7670] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-3 py-2.5 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-center text-sm text-[#7a7670] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#1a3cff] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
