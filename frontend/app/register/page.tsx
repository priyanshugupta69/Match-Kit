"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white border border-[#d8d3c9] rounded-2xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-[#7a7670] mb-6">
            We sent a verification link to <strong>{email}</strong>. Click the link to verify your account, then log in.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white border border-[#d8d3c9] rounded-2xl p-8 max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Create account</h1>
          <p className="text-sm text-[#7a7670]">
            Get started with ResuMatch
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
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priyanshu Gupta"
              className="w-full px-3 py-2.5 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50"
            />
          </div>
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
              placeholder="At least 6 characters"
              className="w-full px-3 py-2.5 border border-[#d8d3c9] rounded-lg text-sm focus:outline-none focus:border-[#1a3cff] bg-[#f5f2ec]/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim() || !password.trim()}
            className="w-full py-2.5 bg-[#1a3cff] text-white text-sm font-medium rounded-lg hover:bg-[#1530cc] transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-[#7a7670] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1a3cff] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
