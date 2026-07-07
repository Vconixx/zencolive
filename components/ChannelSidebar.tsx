"use client";

import { useState } from "react";
import VoiceRoom from "./VoiceRoom";
import ServerMenu from "./ServerMenu";

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

function MiniAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="w-10 h-10 rounded-full object-cover bg-indigo-600 ring-2 ring-indigo-500/40"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center font-bold ring-2 ring-indigo-500/40">
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
  const [serverMenuOpen, setServerMenuOpen] = useState(false);

  return (
    <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col border-r border-black/30 shadow-xl">
      <div className="relative border-b border-[#1e1f22] pb-4">
        <button
          onClick={() => setServerMenuOpen((prev) => !prev)}
          className="w-full text-left text-xl font-bold truncate hover:text-indigo-300 transition flex items-center justify-between gap-2"
        >
          <span className="truncate">{activeServer?.name || "ZencoLive"}</span>
          <span className="text-sm text-gray-400">⌄</span>
        </button>

        <ServerMenu
          open={serverMenuOpen}
          isOwner={isOwner}
          inviteCode={inviteCode}
          onCopyInvite={() => {
            setServerMenuOpen(false);
            onCopyInvite();
          }}
          onRegenerateInvite={() => {
            setServerMenuOpen(false);
            onRegenerateInvite();
          }}
          onLeaveServer={() => {
            setServerMenuOpen(false);
            onLeaveServer();
          }}
          onDeleteServer={() => {
            setServerMenuOpen(false);
            onDeleteServer();
          }}
        />
      </div>

      <div className="mt-5">
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

      <div className="mt-auto bg-[#232428] p-3 rounded-2xl border border-[#3b3d44] shadow-lg">
        <div className="flex items-center gap-3">
          <MiniAvatar username={username} avatarUrl={avatarUrl} />

          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-sm truncate">{username}</p>
            <p className="text-xs text-green-400">
              {currentRole === "admin" ? "Admin" : "Çevrimiçi"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-3 w-full bg-red-600 hover:bg-red-700 rounded-xl px-3 py-2 text-sm font-bold transition hover:scale-[1.02]"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}