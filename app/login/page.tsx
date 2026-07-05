"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

function usernameToAuthEmail(username: string) {
  return `${username.trim().toLowerCase()}@zencolive.local`;
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!username.trim() || !password.trim()) {
      alert("Kullanıcı adı ve şifre gerekli.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    });

    setLoading(false);

    if (error) {
      alert("Giriş yapılamadı: Kullanıcı adı veya şifre hatalı.");
      return;
    }

    if (!rememberMe) {
      sessionStorage.setItem("zencolive_no_remember", "true");
    } else {
      sessionStorage.removeItem("zencolive_no_remember");
    }

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md bg-[#2b2d31] rounded-2xl p-8 shadow-2xl border border-[#404249]">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-bold">
            Z
          </div>
          <h1 className="text-3xl font-bold mt-4">ZencoLive</h1>
          <p className="text-gray-400 mt-2">Kullanıcı adınla giriş yap</p>
        </div>

        <div className="space-y-4">
          <input
            className="w-full bg-[#383a40] rounded-xl px-4 py-3 outline-none"
            placeholder="Kullanıcı adı"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            className="w-full bg-[#383a40] rounded-xl px-4 py-3 outline-none"
            placeholder="Şifre"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
          />

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Beni hatırla
          </label>

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-3 font-bold disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </div>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-indigo-400 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </main>
  );
}