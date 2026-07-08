"use client";

import VoiceRoom from "./VoiceRoom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Server = {
  id: string;
  name: string;
  owner_id: string | null;
  icon_url: string | null;
};

type Channel = {
  id: string;
  server_id: string;
  name: string;
  type: string;
};

type Props = {
  activeServer?: Server;
  textChannels: Channel[];
  voiceChannels: Channel[];
  activeChannelId: string;
  username: string;
  avatarUrl: string | null;
  currentRole: string;
  currentStatus?: string;
  currentManualStatus?: string;
  currentAbout?: string;
  currentProfileColor?: string;
  canManageChannels: boolean;
  onCreateTextChannel: () => void;
  onCreateVoiceChannel: () => void;
  onDeleteTextChannel: (id: string, name: string) => void;
  onDeleteVoiceChannel: (id: string, name: string) => void;
  onSelectChannel: (id: string) => void;
  isOwner: boolean;
  inviteCode?: string | null;
  onCopyInvite: () => void;
  onRegenerateInvite: () => void;
  onLeaveServer: () => void;
  onDeleteServer: () => void;
  onLogout: () => void;
};

const statusOptions = [
  { value: "online", label: "Çevrimiçi", icon: "🟢", color: "text-green-400" },
  { value: "idle", label: "Boşta", icon: "🌙", color: "text-yellow-300" },
  { value: "dnd", label: "Rahatsız Etmeyin", icon: "⛔", color: "text-red-300" },
  { value: "invisible", label: "Görünmez", icon: "⚫", color: "text-gray-300" },
];

function getStatusInfo(status?: string) {
  if (status === "offline") {
    return {
      value: "offline",
      label: "Çevrimdışı",
      icon: "⚫",
      color: "text-gray-300",
    };
  }

  return statusOptions.find((item) => item.value === status) || statusOptions[0];
}

function MiniAvatar({
  username,
  avatarUrl,
  profileColor,
}: {
  username: string;
  avatarUrl: string | null;
  profileColor?: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="w-11 h-11 rounded-full object-cover bg-indigo-600 ring-2 ring-indigo-500/40"
      />
    );
  }

  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center font-black ring-2 ring-indigo-500/40"
      style={{
        background: `linear-gradient(135deg, ${profileColor || "#6366f1"}, #8b5cf6)`,
      }}
    >
      {username[0]?.toUpperCase() || "Z"}
    </div>
  );
}

export default function ChannelSidebar({
  activeServer,
  textChannels,
  voiceChannels,
  activeChannelId,
  username,
  avatarUrl,
  currentRole,
  currentStatus = "online",
  currentManualStatus = "online",
  currentProfileColor = "#6366f1",
  canManageChannels,
  onCreateTextChannel,
  onCreateVoiceChannel,
  onDeleteTextChannel,
  onDeleteVoiceChannel,
  onSelectChannel,
  isOwner,
  inviteCode,
  onCopyInvite,
  onRegenerateInvite,
  onLeaveServer,
  onDeleteServer,
  onLogout,
}: Props) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(currentManualStatus || currentStatus);
  const serverMenuRef = useRef<HTMLDivElement>(null);

  const selectedManualStatus = localStatus || currentManualStatus || "online";
  const statusInfo = getStatusInfo(
    currentStatus === "offline" ? "offline" : selectedManualStatus
  );

  useEffect(() => {
    setLocalStatus(currentManualStatus || currentStatus || "online");
  }, [currentManualStatus, currentStatus]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        serverMenuRef.current &&
        !serverMenuRef.current.contains(e.target as Node)
      ) {
        setServerMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function updateStatus(status: string) {
    setLocalStatus(status);
    setStatusMenuOpen(false);

    const { data } = await supabase.auth.getUser();

    if (!data.user) return;

    await supabase
      .from("profiles")
      .update({
        status,
        manual_status: status,
        last_seen: new Date().toISOString(),
      })
      .eq("id", data.user.id);
  }

  return (
    <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col border-r border-black/30 shadow-xl">
      <div ref={serverMenuRef} className="relative">
        <button
          onClick={() => setServerMenuOpen((prev) => !prev)}
          className="w-full rounded-2xl border border-white/10 bg-[#232428] px-4 py-3 text-left shadow-lg hover:border-indigo-500/40 transition"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-lg font-black">
              {activeServer?.name || "ZencoLive"}
            </p>
            <span className="text-xs text-gray-400">{serverMenuOpen ? "▲" : "▼"}</span>
          </div>
        </button>

        {serverMenuOpen && (
          <div className="absolute left-0 right-0 top-[58px] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl animate-[fadeIn_0.15s_ease-out]">
            <div className="p-2">
              {inviteCode && (
                <button
                  onClick={() => {
                    onCopyInvite();
                    setServerMenuOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-3 text-left hover:bg-[#2b2d31] transition"
                >
                  <p className="text-sm font-black text-white">📋 Davet Kodunu Kopyala</p>
                  <p className="mt-1 text-xs font-bold text-gray-500">{inviteCode}</p>
                </button>
              )}

              {isOwner && (
                <button
                  onClick={() => {
                    onRegenerateInvite();
                    setServerMenuOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-3 text-left hover:bg-[#2b2d31] transition"
                >
                  <p className="text-sm font-black text-white">🔄 Yeni Davet Kodu Oluştur</p>
                  <p className="mt-1 text-xs text-gray-500">Eski kod devre dışı kalır.</p>
                </button>
              )}

              <div className="my-2 h-px bg-white/10" />

              {!isOwner && (
                <button
                  onClick={() => {
                    onLeaveServer();
                    setServerMenuOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-3 text-left text-red-300 hover:bg-red-600/15 transition"
                >
                  <p className="text-sm font-black">🚪 Sunucudan Ayrıl</p>
                </button>
              )}

              {isOwner && (
                <button
                  onClick={() => {
                    onDeleteServer();
                    setServerMenuOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-3 text-left text-red-300 hover:bg-red-600/15 transition"
                >
                  <p className="text-sm font-black">🗑️ Sunucuyu Sil</p>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-gradient-to-br from-[#232428] to-[#1b1c20] p-3 shadow-xl">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("zencolive-open-friends"))}
          className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-indigo-600/20 transition-all duration-200 hover:translate-x-1"
          title="Arkadaşlar ve DM"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-lg transition group-hover:scale-110">
            👥
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">Arkadaşlar</p>
            <p className="truncate text-xs text-gray-400">DM ve istekler</p>
          </div>

          <span className="text-xs text-gray-500 transition group-hover:text-indigo-200">
            →
          </span>
        </button>

        <button
          onClick={() => window.dispatchEvent(new CustomEvent("zencolive-open-friends"))}
          className="mt-1 group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-[#34363d] transition-all duration-200 hover:translate-x-1"
          title="Direkt mesajlar"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-lg transition group-hover:scale-110">
            💬
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">Direkt Mesajlar</p>
            <p className="truncate text-xs text-gray-400">Yakında DM sohbeti</p>
          </div>
        </button>
      </div>

      <div className="mt-5 border-t border-[#1e1f22] pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 font-bold tracking-wide">
            METİN KANALLARI
          </p>

          {canManageChannels && (
            <button
              onClick={onCreateTextChannel}
              className="w-6 h-6 rounded-md hover:bg-indigo-600 text-gray-300 hover:text-white transition"
              title="Metin kanalı oluştur"
            >
              +
            </button>
          )}
        </div>

        <div className="space-y-1">
          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`group flex items-center rounded-xl transition-all duration-200 ${
                activeChannelId === channel.id
                  ? "bg-indigo-600 shadow-lg shadow-indigo-900/40 translate-x-1"
                  : "bg-[#3a3c43] hover:bg-[#4b4d55] hover:translate-x-1"
              }`}
            >
              <button
                onClick={() => onSelectChannel(channel.id)}
                className="flex-1 text-left px-3 py-2 text-gray-100"
              >
                # {channel.name}
              </button>

              {canManageChannels && textChannels.length > 1 && (
                <button
                  onClick={() => onDeleteTextChannel(channel.id, channel.name)}
                  className="opacity-0 group-hover:opacity-100 px-2 text-red-300 hover:text-red-500 transition"
                  title="Kanalı sil"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 font-bold tracking-wide">
            SES KANALLARI
          </p>

          {canManageChannels && (
            <button
              onClick={onCreateVoiceChannel}
              className="w-6 h-6 rounded-md hover:bg-green-600 text-gray-300 hover:text-white transition"
              title="Ses kanalı oluştur"
            >
              +
            </button>
          )}
        </div>

        <VoiceRoom
          username={username}
          voiceChannels={voiceChannels}
          canManageChannels={canManageChannels}
          onDeleteVoiceChannel={onDeleteVoiceChannel}
        />
      </div>

      <div className="relative mt-auto rounded-[28px] border border-white/10 bg-gradient-to-br from-[#2b2d31] via-[#232428] to-[#17181c] p-3 shadow-2xl shadow-black/30 overflow-visible">
        <div
          className="pointer-events-none absolute inset-0 rounded-[28px] opacity-60"
          style={{
            background: `radial-gradient(circle at 20% 0%, ${currentProfileColor}33, transparent 38%)`,
          }}
        />

        {statusMenuOpen && (
          <div className="absolute bottom-[86px] left-0 right-0 z-50 rounded-3xl border border-white/10 bg-[#111214]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]">
            <div className="px-3 pb-2 pt-2">
              <p className="text-xs font-black tracking-wide text-gray-400">
                DURUMUNU DEĞİŞTİR
              </p>
            </div>

            <div className="space-y-1">
              {statusOptions.map((item) => (
                <button
                  key={item.value}
                  onClick={() => updateStatus(item.value)}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 hover:bg-[#2b2d31] ${
                    selectedManualStatus === item.value
                      ? "bg-indigo-600/20 ring-1 ring-indigo-500/30"
                      : ""
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-lg transition group-hover:scale-110">
                    {item.icon}
                  </span>

                  <div>
                    <p className={`text-sm font-black ${item.color}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {item.value === "online" && "Herkes seni aktif görür."}
                      {item.value === "idle" && "Boştaymış gibi görünürsün."}
                      {item.value === "dnd" && "Rahatsız edilmiyorsun."}
                      {item.value === "invisible" && "Çevrimdışı gibi görünürsün."}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setStatusMenuOpen((prev) => !prev)}
            className="relative shrink-0 transition hover:scale-105 active:scale-95"
            title="Durum değiştir"
          >
            <MiniAvatar
              username={username}
              avatarUrl={avatarUrl}
              profileColor={currentProfileColor}
            />

            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-[#232428] bg-[#111214] text-[11px] shadow-lg">
              {statusInfo.icon}
            </span>
          </button>

          <button
            onClick={() => setStatusMenuOpen((prev) => !prev)}
            className="min-w-0 flex-1 text-left"
            title="Durum değiştir"
          >
            <p className="truncate text-sm font-black text-white">{username}</p>
            <p className={`truncate text-xs font-bold ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
          </button>
        </div>

        <div className="relative mt-3 grid grid-cols-4 gap-2">
          <button
            onClick={() => setStatusMenuOpen((prev) => !prev)}
            className="group flex h-10 items-center justify-center rounded-2xl bg-white/5 text-lg transition hover:bg-indigo-600/30 hover:scale-105 active:scale-95"
            title="Durum"
          >
            {statusInfo.icon}
          </button>

          <button
            onClick={() => {
              window.location.href = "/settings";
            }}
            className="group flex h-10 items-center justify-center rounded-2xl bg-white/5 text-lg transition hover:bg-indigo-600/30 hover:scale-105 active:scale-95"
            title="Ayarlar"
          >
            ⚙️
          </button>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("zencolive-open-friends"));
            }}
            className="group flex h-10 items-center justify-center rounded-2xl bg-white/5 text-lg transition hover:bg-indigo-600/30 hover:scale-105 active:scale-95"
            title="Arkadaşlar"
          >
            👥
          </button>

          <button
            onClick={onLogout}
            className="group flex h-10 items-center justify-center rounded-2xl bg-red-600/90 text-lg transition hover:bg-red-700 hover:scale-105 active:scale-95 shadow-lg shadow-red-900/20"
            title="Çıkış yap"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
