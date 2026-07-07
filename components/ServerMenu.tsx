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
    <div className="absolute top-14 left-4 right-4 z-50 bg-[#111214] border border-[#404249] rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      <button
        onClick={onCopyInvite}
        className="w-full text-left px-4 py-3 hover:bg-[#2b2d31] text-sm"
      >
        📋 Davet Kodunu Kopyala
        <span className="block text-xs text-gray-400 mt-1">{inviteCode}</span>
      </button>

      {isOwner && (
        <button
          onClick={onRegenerateInvite}
          className="w-full text-left px-4 py-3 hover:bg-[#2b2d31] text-sm"
        >
          🔄 Yeni Davet Kodu Oluştur
        </button>
      )}

      <div className="h-px bg-[#2b2d31]" />

      {!isOwner && (
        <button
          onClick={onLeaveServer}
          className="w-full text-left px-4 py-3 hover:bg-red-600/20 text-red-300 text-sm"
        >
          🚪 Sunucudan Ayrıl
        </button>
      )}

      {isOwner && (
        <button
          onClick={onDeleteServer}
          className="w-full text-left px-4 py-3 hover:bg-red-600/20 text-red-400 text-sm font-bold"
        >
          🗑 Sunucuyu Sil
        </button>
      )}
    </div>
  );
}