"use client";

type Server = {
  id: string;
  name: string;
  owner_id: string | null;
  icon_url: string | null;
};

type ServerSidebarProps = {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (serverId: string) => void;
  onCreateServer: () => void;
  onOpenSettings: () => void;
  onOpenFriends?: () => void;
  friendsActive?: boolean;
};

export default function ServerSidebar({
  servers,
  activeServerId,
  onSelectServer,
  onCreateServer,
  onOpenSettings,
  onOpenFriends,
  friendsActive = false,
}: ServerSidebarProps) {
  return (
    <aside className="w-20 bg-[#1e1f22] flex flex-col items-center py-4 gap-3 border-r border-black/20">
      <button
        onClick={onOpenFriends}
        title="Arkadaşlar / Direkt Mesajlar"
        className={`group relative w-12 h-12 flex items-center justify-center text-xl transition-all duration-200 overflow-hidden ${
          friendsActive
            ? "rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/40"
            : "rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 hover:scale-105"
        }`}
      >
        <span className="transition group-hover:scale-110">👥</span>
      </button>

      <div className="w-10 h-[2px] bg-[#313338] rounded-full my-1" />
      {servers.length > 0 ? (
        servers.map((server) => {
          const isActive = server.id === activeServerId;

          return (
            <button
              key={server.id}
              onClick={() => onSelectServer(server.id)}
              title={server.name}
              className={`w-12 h-12 flex items-center justify-center font-bold text-xl transition-all duration-200 overflow-hidden ${
                isActive
                  ? "rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-900/40"
                  : "rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 hover:scale-105"
              }`}
            >
              {server.icon_url ? (
                <img
                  src={server.icon_url}
                  alt={server.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                server.name[0]?.toUpperCase() || "Z"
              )}
            </button>
          );
        })
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-900/40">
          Z
        </div>
      )}

      <div className="w-10 h-[2px] bg-[#313338] rounded-full my-1" />

      <button
        onClick={onCreateServer}
        title="Sunucu oluştur"
        className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-green-600 transition-all duration-200 flex items-center justify-center text-2xl hover:scale-105"
      >
        +
      </button>

      <button
        onClick={onOpenSettings}
        title="Ayarlar"
        className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 transition-all duration-200 flex items-center justify-center text-xl hover:scale-105 mt-auto"
      >
        ⚙️
      </button>
    </aside>
  );
}