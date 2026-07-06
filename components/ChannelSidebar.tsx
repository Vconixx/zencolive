"use client";

import VoiceRoom from "./VoiceRoom";

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

type ChannelSidebarProps = {
  activeServer?: Server;
  textChannels: TextChannel[];
  activeChannelId: string;
  username: string;
  avatarUrl: string | null;
  currentRole: string;
  canManageChannels: boolean;
  onCreateChannel: () => void;
  onSelectChannel: (channelId: string) => void;
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
        className="w-9 h-9 rounded-full object-cover bg-indigo-600"
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center font-bold">
      {username[0]?.toUpperCase() || "Z"}
    </div>
  );
}

export default function ChannelSidebar({
  activeServer,
  textChannels,
  activeChannelId,
  username,
  avatarUrl,
  currentRole,
  canManageChannels,
  onCreateChannel,
  onSelectChannel,
  onLogout,
}: ChannelSidebarProps) {
  return (
    <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col border-r border-black/20">
      <h1 className="text-xl font-bold border-b border-[#1e1f22] pb-4 truncate">
        {activeServer?.name || "ZencoLive"}
      </h1>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 font-bold">METİN KANALLARI</p>

          {canManageChannels && (
            <button
              onClick={onCreateChannel}
              className="w-6 h-6 rounded hover:bg-[#50525a] text-gray-300 hover:text-white transition"
              title="Kanal Oluştur"
            >
              +
            </button>
          )}
        </div>

        <div className="space-y-1">
          {textChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-gray-200 transition-all duration-200 ${
                activeChannelId === channel.id
                  ? "bg-indigo-600 shadow-lg shadow-indigo-900/30 translate-x-1"
                  : "bg-[#404249] hover:bg-[#50525a] hover:translate-x-1"
              }`}
            >
              # {channel.name}
            </button>
          ))}
        </div>
      </div>

      <VoiceRoom username={username} />

      <div className="mt-auto bg-[#232428] p-3 rounded-xl border border-[#3b3d44]">
        <div className="flex items-center gap-3">
          <MiniAvatar username={username} avatarUrl={avatarUrl} />

          <div className="flex-1">
            <p className="font-bold text-sm">{username}</p>
            <p className="text-xs text-green-400">
              {currentRole === "admin" ? "Admin" : "Çevrimiçi"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="mt-3 w-full bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 hover:scale-[1.02]"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}