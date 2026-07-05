"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import VoiceRoom from "../components/VoiceRoom";

type Message = {
  id: number;
  username: string;
  content: string;
  created_at: string;
  user_id: string | null;
  channel_id: string;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  role: string | null;
};

const textChannels = [
  { id: "genel", name: "genel-sohbet" },
  { id: "duyurular", name: "duyurular" },
  { id: "yardim", name: "yardım" },
  { id: "oyun", name: "oyun" },
];

function Avatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "w-9 h-9" : size === "lg" ? "w-16 h-16" : "w-11 h-11";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClass} rounded-full object-cover bg-indigo-600 cursor-pointer`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center font-bold cursor-pointer`}
    >
      {username[0]?.toUpperCase() || "Z"}
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("user");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState("genel");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChannelName =
    textChannels.find((c) => c.id === activeChannel)?.name || "genel-sohbet";

  function getProfileForMessage(msg: Message) {
    if (msg.user_id) return profiles.find((p) => p.id === msg.user_id) || null;
    return profiles.find((p) => p.username === msg.username) || null;
  }

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(data.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, banner_url, role")
        .eq("id", data.user.id)
        .single();

      const name =
        profile?.username ||
        data.user.user_metadata?.username ||
        data.user.email?.split("@")[0] ||
        "Kullanıcı";

      setUsername(name);
      setAvatarUrl(profile?.avatar_url || null);
      setCurrentRole(profile?.role || "user");
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function getProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, banner_url, role");

    if (data) setProfiles(data);
  }

  async function getMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("id, username, content, created_at, user_id, channel_id")
      .eq("channel_id", activeChannel)
      .order("created_at", { ascending: true });

    if (!error && data) setMessages(data);
  }

  async function sendMessage() {
    if (!content.trim()) return;

    const { error } = await supabase.from("messages").insert({
      username,
      user_id: currentUserId,
      channel_id: activeChannel,
      content,
    });

    if (error) {
      alert("Mesaj gönderilemedi: " + error.message);
      return;
    }

    setContent("");
  }

  async function deleteMessage(msg: Message) {
    const canDelete = msg.user_id === currentUserId || currentRole === "admin";

    if (!canDelete) {
      alert("Bu mesajı silme yetkin yok.");
      return;
    }

    if (!confirm("Bu mesaj silinsin mi?")) return;

    const { error } = await supabase.from("messages").delete().eq("id", msg.id);

    if (error) alert("Mesaj silinemedi: " + error.message);
  }

  async function saveEdit(msg: Message) {
    if (msg.user_id !== currentUserId) {
      alert("Sadece kendi mesajını düzenleyebilirsin.");
      return;
    }

    if (!editingContent.trim()) return;

    const { error } = await supabase
      .from("messages")
      .update({ content: editingContent })
      .eq("id", msg.id);

    if (error) {
      alert("Mesaj düzenlenemedi: " + error.message);
      return;
    }

    setEditingId(null);
    setEditingContent("");
  }

  function startEdit(msg: Message) {
    if (msg.user_id !== currentUserId) return;

    setEditingId(msg.id);
    setEditingContent(msg.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent("");
  }

  useEffect(() => {
    getMessages();
  }, [activeChannel]);

  useEffect(() => {
    getProfiles();

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMessage = payload.new as Message;
            if (newMessage.channel_id === activeChannel) {
              setMessages((prev) => [...prev, newMessage]);
            }
          }

          if (payload.eventType === "UPDATE") {
            const updatedMessage = payload.new as Message;

            if (updatedMessage.channel_id !== activeChannel) return;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }

          if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    const profileInterval = setInterval(getProfiles, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(profileInterval);
    };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#313338] text-white flex items-center justify-center">
        <p>Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#313338] text-white flex">
      <aside className="w-20 bg-[#1e1f22] flex flex-col items-center py-4 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-xl">
          Z
        </div>

        {["🎮", "🎧", "💬"].map((icon) => (
          <div
            key={icon}
            className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center text-xl cursor-pointer"
          >
            {icon}
          </div>
        ))}

        <button
          onClick={() => router.push("/settings")}
          className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center text-xl"
        >
          ⚙️
        </button>
      </aside>

      <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col">
        <h1 className="text-xl font-bold border-b border-[#1e1f22] pb-4">
          ZencoLive
        </h1>

        <div className="mt-4">
          <p className="text-xs text-gray-400 font-bold mb-2">
            METİN KANALLARI
          </p>

          {textChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                setActiveChannel(channel.id);
                setEditingId(null);
                setContent("");
              }}
              className={`w-full text-left px-3 py-2 rounded text-gray-200 cursor-pointer ${
                activeChannel === channel.id
                  ? "bg-indigo-600"
                  : "bg-[#404249] hover:bg-[#50525a]"
              }`}
            >
              # {channel.name}
            </button>
          ))}
        </div>

        <VoiceRoom username={username} />

        <div className="mt-auto bg-[#232428] p-3 rounded">
          <div className="flex items-center gap-3">
            <Avatar username={username} avatarUrl={avatarUrl} size="sm" />

            <div className="flex-1">
              <p className="font-bold text-sm">{username}</p>
              <p className="text-xs text-green-400">
                {currentRole === "admin" ? "Admin" : "Çevrimiçi"}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-3 w-full bg-red-600 hover:bg-red-700 rounded px-3 py-2 text-sm font-bold"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <section className="flex-1 flex flex-col h-screen">
        <header className="h-14 bg-[#313338] border-b border-[#1e1f22] flex items-center px-6">
          <h2 className="font-bold"># {activeChannelName}</h2>
        </header>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {messages.map((msg) => {
            const profile = getProfileForMessage(msg);
            const displayName = profile?.username || msg.username || "Anonim";
            const displayAvatar = profile?.avatar_url || null;

            const canEdit = msg.user_id === currentUserId;
            const canDelete = msg.user_id === currentUserId || currentRole === "admin";

            return (
              <div key={msg.id} className="group flex gap-4">
                <div onClick={() => profile && setSelectedProfile(profile)}>
                  <Avatar username={displayName} avatarUrl={displayAvatar} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => profile && setSelectedProfile(profile)}
                      className="font-bold hover:underline"
                    >
                      {displayName}
                    </button>

                    <span className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleString("tr-TR")}
                    </span>

                    {(canEdit || canDelete) && (
                      <div className="hidden group-hover:flex gap-2 ml-2">
                        {canEdit && (
                          <button
                            onClick={() => startEdit(msg)}
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Düzenle
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => deleteMessage(msg)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingId === msg.id ? (
                    <div className="mt-2">
                      <input
                        className="w-full bg-[#383a40] rounded px-3 py-2 text-white outline-none"
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(msg);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                      />

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => saveEdit(msg)}
                          className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                        >
                          Kaydet
                        </button>

                        <button
                          onClick={cancelEdit}
                          className="text-xs bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-300">{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-5 flex gap-3">
          <input
            className="flex-1 bg-[#383a40] rounded-xl px-4 py-3 text-white outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder={`#${activeChannelName} kanalına mesaj gönder...`}
          />

          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 rounded-xl font-bold"
          >
            Gönder
          </button>
        </div>
      </section>

      {selectedProfile && (
        <div
          onClick={() => setSelectedProfile(null)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#2b2d31] rounded-2xl overflow-hidden border border-[#404249] shadow-2xl"
          >
            <div
              className="h-32 bg-gradient-to-r from-indigo-600 to-purple-700 bg-cover bg-center"
              style={
                selectedProfile.banner_url
                  ? { backgroundImage: `url(${selectedProfile.banner_url})` }
                  : undefined
              }
            />

            <div className="p-5">
              <div className="-mt-14 mb-4">
                <Avatar
                  username={selectedProfile.username}
                  avatarUrl={selectedProfile.avatar_url}
                  size="lg"
                />
              </div>

              <h2 className="text-2xl font-bold">{selectedProfile.username}</h2>
              <p className="text-sm text-green-400 mt-1">
                {selectedProfile.role === "admin" ? "Admin" : "Çevrimiçi"}
              </p>

              <div className="mt-5 bg-[#232428] rounded-xl p-4">
                <p className="text-xs text-gray-400 font-bold mb-1">
                  ZENCOLIVE PROFİLİ
                </p>
                <p className="text-sm text-gray-300">
                  Henüz hakkında bilgisi yok.
                </p>
              </div>

              <button
                onClick={() => setSelectedProfile(null)}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2 font-bold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}