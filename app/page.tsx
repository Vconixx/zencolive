"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import ServerSidebar from "../components/ServerSidebar";
import ChannelSidebar from "../components/ChannelSidebar";
import CreateServerModal from "../components/CreateServerModal";
import CreateChannelModal from "../components/CreateChannelModal";

type Message = {
  id: number;
  username: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  user_id: string | null;
  channel_id: string | null;
  server_id: string | null;
  channel_uuid: string | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  role: string | null;
};

type Server = {
  id: string;
  name: string;
  owner_id: string | null;
  icon_url: string | null;
};

type TextChannel = {
  id: string;
  server_id: string;
  name: string;
  type: string;
};

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
        className={`${sizeClass} rounded-full object-cover bg-indigo-600 cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all duration-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center font-bold cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all duration-200`}
    >
      {username[0]?.toUpperCase() || "Z"}
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [servers, setServers] = useState<Server[]>([]);
  const [textChannels, setTextChannels] = useState<TextChannel[]>([]);
  const [activeServerId, setActiveServerId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("user");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createServerLoading, setCreateServerLoading] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createChannelLoading, setCreateChannelLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeServer =
    servers.find((server) => server.id === activeServerId) || servers[0];

  const activeChannel =
    textChannels.find((channel) => channel.id === activeChannelId) ||
    textChannels[0];

  const activeChannelName = activeChannel?.name || "genel-sohbet";

  const canManageChannels =
    !!activeServer && activeServer.owner_id === currentUserId;

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 100);
  }

  function getProfileForMessage(msg: Message) {
    if (msg.user_id) return profiles.find((p) => p.id === msg.user_id) || null;
    return profiles.find((p) => p.username === msg.username) || null;
  }

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

  async function getServers() {
    const { data, error } = await supabase
      .from("servers")
      .select("id, name, owner_id, icon_url")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setServers(data);

      if (!activeServerId && data.length > 0) {
        setActiveServerId(data[0].id);
      }
    }
  }

  async function getChannels(serverId: string) {
    const { data, error } = await supabase
      .from("channels")
      .select("id, server_id, name, type")
      .eq("server_id", serverId)
      .eq("type", "text")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setTextChannels(data);
      setActiveChannelId(data[0]?.id || "");
    }
  }

  async function createDefaultChannels(serverId: string) {
    await supabase.from("channels").insert({
      server_id: serverId,
      name: "genel-sohbet",
      type: "text",
    });
  }

  async function createServer(serverName: string) {
    if (!currentUserId) return;

    setCreateServerLoading(true);

    const { data: serverData, error: serverError } = await supabase
      .from("servers")
      .insert({
        name: serverName,
        owner_id: currentUserId,
        icon_url: null,
      })
      .select("id, name, owner_id, icon_url")
      .single();

    if (serverError || !serverData) {
      setCreateServerLoading(false);
      alert("Sunucu oluşturulamadı: " + serverError?.message);
      return;
    }

    const { error: memberError } = await supabase.from("server_members").insert({
      server_id: serverData.id,
      user_id: currentUserId,
      role: "owner",
    });

    if (memberError) {
      setCreateServerLoading(false);
      alert("Sunucu üyeliği oluşturulamadı: " + memberError.message);
      return;
    }

    await createDefaultChannels(serverData.id);

    setServers((prev) => [...prev, serverData]);
    setActiveServerId(serverData.id);
    setCreateServerOpen(false);
    setCreateServerLoading(false);

    await getChannels(serverData.id);
  }

  async function createChannel(channelName: string) {
    if (!activeServerId) return;

    if (!canManageChannels) {
      alert("Kanal oluşturma yetkin yok.");
      return;
    }

    setCreateChannelLoading(true);

    const { data, error } = await supabase
      .from("channels")
      .insert({
        server_id: activeServerId,
        name: channelName,
        type: "text",
      })
      .select("id, server_id, name, type")
      .single();

    setCreateChannelLoading(false);

    if (error || !data) {
      alert("Kanal oluşturulamadı: " + error?.message);
      return;
    }

    setTextChannels((prev) => [...prev, data]);
    setActiveChannelId(data.id);
    setCreateChannelOpen(false);
    setContent("");
    setEditingId(null);
    setMessages([]);
  }

  async function deleteChannel(channelId: string, channelName: string) {
    if (!canManageChannels) {
      alert("Kanal silme yetkin yok.");
      return;
    }

    if (textChannels.length <= 1) {
      alert("Son metin kanalını silemezsin.");
      return;
    }

    const ok = confirm(`#${channelName} kanalı silinsin mi?`);
    if (!ok) return;

    const { error } = await supabase
      .from("channels")
      .delete()
      .eq("id", channelId);

    if (error) {
      alert("Kanal silinemedi: " + error.message);
      return;
    }

    const remaining = textChannels.filter((c) => c.id !== channelId);
    setTextChannels(remaining);

    if (activeChannelId === channelId) {
      setActiveChannelId(remaining[0]?.id || "");
      setMessages([]);
    }
  }

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
    if (!activeServerId || !activeChannelId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, username, content, created_at, edited_at, user_id, channel_id, server_id, channel_uuid"
      )
      .eq("server_id", activeServerId)
      .eq("channel_uuid", activeChannelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      scrollToBottom("auto");
    }
  }

  async function sendMessage() {
    if (!content.trim()) return;
    if (!activeServerId || !activeChannelId) return;

    const { error } = await supabase.from("messages").insert({
      username,
      user_id: currentUserId,
      server_id: activeServerId,
      channel_uuid: activeChannelId,
      channel_id: activeChannelName,
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
      .update({
        content: editingContent,
        edited_at: new Date().toISOString(),
      })
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
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUserId) getServers();
  }, [currentUserId]);

  useEffect(() => {
    if (activeServerId) {
      getChannels(activeServerId);
      setEditingId(null);
      setContent("");
      setMessages([]);
    }
  }, [activeServerId]);

  useEffect(() => {
    getMessages();
  }, [activeServerId, activeChannelId]);

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

            if (
              newMessage.server_id === activeServerId &&
              newMessage.channel_uuid === activeChannelId
            ) {
              setMessages((prev) => [...prev, newMessage]);
              scrollToBottom("smooth");
            }
          }

          if (payload.eventType === "UPDATE") {
            const updatedMessage = payload.new as Message;

            if (
              updatedMessage.server_id !== activeServerId ||
              updatedMessage.channel_uuid !== activeChannelId
            ) {
              return;
            }

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
  }, [activeServerId, activeChannelId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#313338] text-white flex items-center justify-center">
        <p>Yükleniyor...</p>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        .zenco-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .zenco-scroll::-webkit-scrollbar-track {
          background: #2b2d31;
          border-radius: 999px;
        }

        .zenco-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6366f1, #9333ea);
          border-radius: 999px;
          border: 2px solid #2b2d31;
        }

        .zenco-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #818cf8, #a855f7);
        }

        .zenco-scroll {
          scrollbar-width: thin;
          scrollbar-color: #7c3aed #2b2d31;
        }
      `}</style>

      <main className="min-h-screen bg-[#313338] text-white flex">
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          onSelectServer={(serverId) => {
            setActiveServerId(serverId);
            setActiveChannelId("");
            setEditingId(null);
            setContent("");
          }}
          onCreateServer={() => setCreateServerOpen(true)}
          onOpenSettings={() => router.push("/settings")}
        />

        <ChannelSidebar
          activeServer={activeServer}
          textChannels={textChannels}
          activeChannelId={activeChannelId}
          username={username}
          avatarUrl={avatarUrl}
          currentRole={currentRole}
          canManageChannels={canManageChannels}
          onCreateChannel={() => setCreateChannelOpen(true)}
          onDeleteChannel={deleteChannel}
          onSelectChannel={(channelId) => {
            setActiveChannelId(channelId);
            setEditingId(null);
            setContent("");
          }}
          onLogout={logout}
        />

        <section className="flex-1 flex flex-col h-screen">
          <header className="h-14 bg-[#313338]/95 backdrop-blur border-b border-[#1e1f22] flex items-center px-6 shadow-sm">
            <h2 className="font-bold"># {activeChannelName}</h2>
          </header>

          <div className="zenco-scroll flex-1 p-6 space-y-2 overflow-y-auto scroll-smooth">
            {messages.map((msg) => {
              const profile = getProfileForMessage(msg);
              const displayName = profile?.username || msg.username || "Anonim";
              const displayAvatar = profile?.avatar_url || null;

              const canEdit = msg.user_id === currentUserId;
              const canDelete =
                msg.user_id === currentUserId || currentRole === "admin";

              return (
                <div
                  key={msg.id}
                  className="group flex gap-4 rounded-xl px-3 py-2 transition-all duration-200 hover:bg-[#2b2d31]"
                >
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
                        {msg.edited_at && " · düzenlendi"}
                      </span>

                      {(canEdit || canDelete) && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 ml-2 transition-opacity duration-200">
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
                          className="w-full bg-[#383a40] rounded-xl px-3 py-2 text-white outline-none border border-indigo-600/40"
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
                      <p className="text-gray-300 leading-relaxed">
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-5 flex gap-3 bg-[#313338]/95 backdrop-blur border-t border-[#1e1f22]">
            <input
              className="flex-1 bg-[#383a40] rounded-xl px-4 py-3 text-white outline-none border border-transparent focus:border-indigo-500 transition-all duration-200"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder={`#${activeChannelName} kanalına mesaj gönder...`}
            />

            <button
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 px-5 rounded-xl font-bold transition-all duration-200 hover:scale-[1.03] shadow-lg shadow-indigo-900/30"
            >
              Gönder
            </button>
          </div>
        </section>

        {selectedProfile && (
          <div
            onClick={() => setSelectedProfile(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#2b2d31] rounded-2xl overflow-hidden border border-[#404249] shadow-2xl animate-[fadeIn_0.15s_ease-out]"
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

                <h2 className="text-2xl font-bold">
                  {selectedProfile.username}
                </h2>
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
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2 font-bold transition-all duration-200 hover:scale-[1.02]"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        <CreateServerModal
          open={createServerOpen}
          loading={createServerLoading}
          onClose={() => setCreateServerOpen(false)}
          onCreate={createServer}
        />

        <CreateChannelModal
          open={createChannelOpen}
          loading={createChannelLoading}
          onClose={() => setCreateChannelOpen(false)}
          onCreate={createChannel}
        />
      </main>
    </>
  );
}