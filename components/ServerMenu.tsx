"use client";

type Props = {
  open: boolean;
  isOwner: boolean;
  inviteCode?: string | null;
  onCopyInvite: () => void;
  onRegenerateInvite: () => void;
  onLeaveServer: () => void;
  onDeleteServer: () => void;
};

export default function ServerMenu({
  open,
  isOwner,
  inviteCode,
  onCopyInvite,
  onRegenerateInvite,
  onLeaveServer,
  onDeleteServer,
}: Props) {
  if (!open) return null;

  return (
    <div className="absolute top-12 left-0 right-0 z-50 rounded-2xl bg-[#111214] border border-[#3b3d44] shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      <div className="p-2 space-y-1">
        <button
          onClick={onCopyInvite}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-indigo-600 transition"
        >
          <span className="text-lg">📋</span>
          <div>
            <p className="text-sm font-bold text-white">Davet Kodunu Kopyala</p>
            <p className="text-xs text-gray-400">{inviteCode || "Kod yok"}</p>
          </div>
        </button>

        {isOwner && (
          <button
            onClick={onRegenerateInvite}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#2b2d31] transition"
          >
            <span className="text-lg">🔄</span>
            <p className="text-sm font-bold text-white">Yeni Davet Kodu Oluştur</p>
          </button>
        )}

        <div className="h-px bg-[#2b2d31] my-2" />

        {!isOwner && (
          <button
            onClick={onLeaveServer}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-red-600/20 transition"
          >
            <span className="text-lg">🚪</span>
            <p className="text-sm font-bold text-red-300">Sunucudan Ayrıl</p>
          </button>
        )}

        {isOwner && (
          <button
            onClick={onDeleteServer}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-red-600/20 transition"
          >
            <span className="text-lg">🗑</span>
            <p className="text-sm font-bold text-red-400">Sunucuyu Sil</p>
          </button>
        )}
      </div>
    </div>
  );
}