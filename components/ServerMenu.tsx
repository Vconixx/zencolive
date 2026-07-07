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
    <div className="absolute top-[58px] left-0 right-0 z-50 rounded-2xl bg-[#1f2026] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden animate-[fadeIn_0.15s_ease-out]">
      <div className="p-3">
        <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 p-4">
          <p className="text-xs text-indigo-100 font-bold">DAVET KODU</p>
          <p className="text-2xl font-black tracking-widest text-white mt-1">
            {inviteCode || "YOK"}
          </p>
        </div>

        <button
          onClick={onCopyInvite}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-[#2b2d31] hover:bg-indigo-600 transition-all hover:translate-x-1"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-xl">
            📋
          </div>
          <div>
            <p className="text-sm font-bold text-white">Davet Kodunu Kopyala</p>
            <p className="text-xs text-gray-400">Arkadaşına göndermek için kopyala</p>
          </div>
        </button>

        {isOwner && (
          <button
            onClick={onRegenerateInvite}
            className="mt-2 w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-[#2b2d31] hover:bg-purple-600 transition-all hover:translate-x-1"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <p className="text-sm font-bold text-white">Yeni Davet Kodu Oluştur</p>
              <p className="text-xs text-gray-400">Eski kod geçersiz olur</p>
            </div>
          </button>
        )}

        <div className="my-3 h-px bg-white/10" />

        {!isOwner && (
          <button
            onClick={onLeaveServer}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-[#2b2d31] hover:bg-red-600/25 transition-all hover:translate-x-1"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-xl">
              🚪
            </div>
            <div>
              <p className="text-sm font-bold text-red-300">Sunucudan Ayrıl</p>
              <p className="text-xs text-gray-400">Bu sunucudan çıkarsın</p>
            </div>
          </button>
        )}

        {isOwner && (
          <button
            onClick={onDeleteServer}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 transition-all hover:translate-x-1"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600/25 flex items-center justify-center text-xl">
              🗑️
            </div>
            <div>
              <p className="text-sm font-black text-red-400">Sunucuyu Sil</p>
              <p className="text-xs text-red-200/70">Bu işlem geri alınamaz</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}