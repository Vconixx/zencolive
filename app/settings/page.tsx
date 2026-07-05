"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", data.user.id)
        .single();

      setUsername(profile?.username || "Kullanıcı");
      setAvatarUrl(profile?.avatar_url || null);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function uploadAvatar(file: File) {
    if (!userId) return;

    setSaving(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      setSaving(false);
      alert("Fotoğraf yüklenemedi: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

    setAvatarUrl(data.publicUrl);
    setSaving(false);
  }

  async function saveProfile() {
    if (!username.trim()) {
      alert("Kullanıcı adı boş olamaz.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      alert("Profil kaydedilemedi: " + error.message);
      return;
    }

    alert("Profil kaydedildi.");
    router.push("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1e1f22] text-white flex items-center justify-center">
        Yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1e1f22] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#2b2d31] rounded-2xl border border-[#404249] shadow-2xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-700"></div>

        <div className="p-8">
          <div className="-mt-20 mb-6 flex items-end gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-28 h-28 rounded-full object-cover border-4 border-[#2b2d31] bg-indigo-600"
              />
            ) : (
              <div className="w-28 h-28 rounded-full border-4 border-[#2b2d31] bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-4xl font-bold">
                {username[0]?.toUpperCase() || "Z"}
              </div>
            )}

            <div className="pb-3">
              <h1 className="text-2xl font-bold">Profil Ayarları</h1>
              <p className="text-gray-400 text-sm">ZencoLive profilini düzenle</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Profil fotoğrafı
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                }}
                className="w-full bg-[#383a40] rounded-xl px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Kullanıcı adı
              </label>

              <input
                className="w-full bg-[#383a40] rounded-xl px-4 py-3 outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 bg-[#404249] hover:bg-[#50535a] rounded-xl py-3 font-bold"
              >
                Geri Dön
              </button>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl py-3 font-bold disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}