"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppApi } from "@/lib/api-client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    console.log("[AdminLogin] submit handler called");
    console.log("[AdminLogin] payload", {
      email,
      passwordLength: password.length,
      apiBase: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    });
    setError(null);
    setLoading(true);

    try {
      console.log("[AdminLogin] sending POST /api/admin/auth/login");
      const response = await AppApi.admin.auth.login({ email, password });
      console.log("[AdminLogin] login success", response);

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      console.error("[AdminLogin] login failed", err);
      setError(err.message || "Ошибка соединения. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      {/* Bg glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-red/8 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-brand-red font-black text-4xl">YS</span>
          <p className="text-brand-text-muted text-sm mt-2">Панель управления</p>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-black text-white mb-6">Вход</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-muted mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="py-3 px-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-3.5"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
