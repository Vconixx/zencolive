"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StatusType = "online" | "idle" | "dnd" | "invisible";

const statusOptions: { value: StatusType; label: string; dot: string; desc: string }[] = [
  { value: "online", label: "Çevrimiçi", dot: "🟢", desc: "Herkes seni çevrimiçi görür." },
  { value: "idle", label: "Boşta", dot: "🌙", desc: "Uygulamada değilsin gibi görünür." },
  { value: "dnd", label: "Rahatsız Etmeyin", dot: "🔴", desc: "Bildirim almak istemiyorsun." },
  { value: "invisible", label: "Görünmez", dot: "⚫", desc: "Çevrimdışı gibi görünürsün." },
];

const colorOptions = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#06b6d4",
  "#64748b",
];

export default function SettingsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [about, setAbout] = useState("");
  const [status, setStatus] = useState<StatusType>("online");
  const [profileColor, setProfileColor] = useState("#6366f1");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }

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
        .select("username, avatar_url, banner_url, about, status, profile_color")
        .eq("id", data.user.id)
        .single();

      setUsername(profile?.username || "Kullanıcı");
      setAvatarUrl(profile?.avatar_url || null);
      setBannerUrl(profile?.banner_url || null);
      setAbout(profile?.about || "");
      setStatus((profile?.status || "online") as StatusType);
      setProfileColor(profile?.profile_color || "#6366f1");
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function uploadImage(file: File, bucket: "avatars" | "banners") {
    if (!userId) return;

    if (!file.type.startsWith("image/")) {
      showToast("Sadece resim yükleyebilirsin.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast("Resim en fazla 20 MB olabilir.");
      return;
    }

    setSaving(true);

    const fileExt = file.name.split(".").pop() || "png";
    const filePath = `${userId}/${bucket === "avatars" ? "avatar" : "banner"}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setSaving(false);
      showToast("Yükleme başarısız: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const url = `${data.publicUrl}?v=${Date.now()}`;

    if (bucket === "avatars") {
      setAvatarUrl(url);
      showToast("Profil fotoğrafı yüklendi.");
    } else {
      setBannerUrl(url);
      showToast("Banner yüklendi.");
    }

    setSaving(false);
  }

  async function saveProfile() {
    if (!username.trim()) {
      showToast("Kullanıcı adı boş olamaz.");
      return;
    }

    if (about.length > 190) {
      showToast("Hakkımda en fazla 190 karakter olabilir.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        about: about.trim(),
        status,
        profile_color: profileColor,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      showToast("Profil kaydedilemedi: " + error.message);
      return;
    }

    showToast("Profil kaydedildi.");
    setTimeout(() => router.push("/"), 700);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1e1f22] text-white flex items-center justify-center">
        Yükleniyor...
      </main>
    );
  }

  const currentStatus = statusOptions.find((item) => item.value === status) || statusOptions[0];

  return (
    <main className="min-h-screen bg-[#1e1f22] text-white p-4 md:p-8">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111214] px-5 py-3 text-sm font-bold shadow-2xl">
          {toast}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-white/10 bg-[#2b2d31] shadow-2xl overflow-hidden">
          <div
            className="relative h-52 bg-gradient-to-r from-indigo-600 to-purple-700 bg-cover bg-center"
            style={
              bannerUrl
                ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.05), rgba(0,0,0,.55)), url(${bannerUrl})` }
                : { background: `linear-gradient(135deg, ${profileColor}, #111214)` }
            }
          >
            <button
              onClick={() => router.push("/")}
              className="absolute left-5 top-5 rounded-2xl bg-black/35 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-black/50 transition"
            >
              ← Geri Dön
            </button>

            <label className="absolute bottom-5 right-5 cursor-pointer rounded-2xl bg-black/40 px-4 py-2 text-sm font-bold backdrop-blur hover:bg-black/60 transition">
              Banner Değiştir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file, "banners");
                }}
              />
            </label>
          </div>

          <div className="p-6 md:p-8">
            <div className="-mt-20 mb-8 flex flex-col gap-4 md:flex-row md:items-end">
              <div className="relative w-fit">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="h-32 w-32 rounded-full object-cover border-8 border-[#2b2d31] bg-indigo-600 shadow-2xl"
                  />
                ) : (
                  <div
                    className="h-32 w-32 rounded-full border-8 border-[#2b2d31] flex items-center justify-center text-5xl font-black shadow-2xl"
                    style={{ background: `linear-gradient(135deg, ${profileColor}, #8b5cf6)` }}
                  >
                    {username[0]?.toUpperCase() || "Z"}
                  </div>
                )}

                <label className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 border-4 border-[#2b2d31] transition">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file, "avatars");
                    }}
                  />
                </label>
              </div>

              <div className="pb-2">
                <h1 className="text-3xl font-black">Profil Ayarları</h1>
                <p className="text-gray-400">ZencoLive profilini kişiselleştir</p>
              </div>
            </div>

            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">
                  Kullanıcı adı
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[#383a40] px-4 py-3 outline-none focus:border-indigo-500 transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={24}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-300">
                    Hakkımda
                  </label>
                  <span className="text-xs text-gray-500">{about.length}/190</span>
                </div>
                <textarea
                  className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#383a40] px-4 py-3 outline-none focus:border-indigo-500 transition"
                  value={about}
                  onChange={(e) => setAbout(e.target.value.slice(0, 190))}
                  placeholder="Kendinden kısa kısa bahset..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">
                  Durum
                </label>

                <div className="grid gap-2 md:grid-cols-2">
                  {statusOptions.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setStatus(item.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:translate-x-1 ${
                        status === item.value
                          ? "border-indigo-500 bg-indigo-600/20"
                          : "border-white/10 bg-[#383a40] hover:border-indigo-500/50"
                      }`}
                    >
                      <div className="font-black">
                        {item.dot} {item.label}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-300">
                  Profil rengi
                </label>

                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setProfileColor(color)}
                      className={`h-11 w-11 rounded-2xl border-4 transition hover:scale-110 ${
                        profileColor === color
                          ? "border-white"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 rounded-2xl bg-[#404249] py-3 font-black hover:bg-[#50535a] transition"
                >
                  Geri Dön
                </button>

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-indigo-600 py-3 font-black hover:bg-indigo-700 disabled:opacity-60 transition shadow-lg shadow-indigo-900/25"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-[#2b2d31] p-5 shadow-2xl h-fit">
          <p className="mb-4 text-sm font-black text-gray-300">Canlı Önizleme</p>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111214]">
            <div
              className="h-32 bg-cover bg-center"
              style={
                bannerUrl
                  ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.05), rgba(0,0,0,.75)), url(${bannerUrl})` }
                  : { background: `linear-gradient(135deg, ${profileColor}, #111214)` }
              }
            />

            <div className="p-5">
              <div className="-mt-16 mb-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="h-24 w-24 rounded-full object-cover border-8 border-[#111214] bg-indigo-600"
                  />
                ) : (
                  <div
                    className="h-24 w-24 rounded-full border-8 border-[#111214] flex items-center justify-center text-4xl font-black"
                    style={{ background: `linear-gradient(135deg, ${profileColor}, #8b5cf6)` }}
                  >
                    {username[0]?.toUpperCase() || "Z"}
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-black">{username || "Kullanıcı"}</h2>
              <p className="mt-1 text-sm text-gray-300">
                {currentStatus.dot} {currentStatus.label}
              </p>

              <div className="mt-5 rounded-2xl bg-[#232428] p-4">
                <p className="mb-1 text-xs font-black text-gray-400">HAKKIMDA</p>
                <p className="text-sm text-gray-300">
                  {about.trim() || "Henüz hakkında bilgisi yok."}
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-[#232428] p-4">
                <p className="mb-1 text-xs font-black text-gray-400">PROFİL RENGİ</p>
                <div className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: profileColor }}
                  />
                  <span className="text-sm text-gray-300">{profileColor}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
