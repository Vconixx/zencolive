"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!username.trim() || !email.trim() || !password.trim()) {
      alert("Kullanıcı adı, e-posta ve şifre gerekli.");
      return;
    }

    if (password.length < 6) {
      alert("Şifre en az 6 karakter olmalı.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });

    if (error) {
      setLoading(false);
      alert("Kayıt olunamadı: " + error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.trim(),
        avatar_url: null,
      });

      if (profileError) {
        setLoading(false);
        alert("Profil oluşturulamadı: " + profileError.message);
        return;
      }
    }

    setLoading(false);
    alert("Kayıt başarılı. Şimdi giriş yapabilirsin.");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md bg-[#2b2d31] rounded-2xl p-8 shadow-2xl border border-[#404249]">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-bold">
            Z
          </div>
          <h1 className="text-3xl font-bold mt-4">ZencoLive</h1>
          <p className="text-gray-400 mt-2">Yeni hesap oluştur</p>
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
            placeholder="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full bg-[#383a40] rounded-xl px-4 py-3 outline-none"
            placeholder="Şifre"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") register();
            }}
          />

          <button
            onClick={register}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-3 font-bold disabled:opacity-60"
          >
            {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
          </button>
        </div>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}