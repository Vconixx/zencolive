"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
};

export default function ServerActionModal({
  open,
  onClose,
  onCreateServer,
  onJoinServer,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2b2d31] border border-[#404249] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e1f22]">
          <h2 className="text-2xl font-bold text-white">Sunucu Ekle</h2>
          <p className="text-sm text-gray-400 mt-1">
            Yeni sunucu oluştur veya davet koduyla katıl.
          </p>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => {
              onClose();
              onCreateServer();
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl p-4 text-left transition hover:scale-[1.02]"
          >
            <p className="font-bold text-white">➕ Yeni Sunucu Oluştur</p>
            <p className="text-sm text-indigo-100 mt-1">
              Kendi sunucunu kur.
            </p>
          </button>

          <button
            onClick={() => {
              onClose();
              onJoinServer();
            }}
            className="w-full bg-[#383a40] hover:bg-[#45474f] rounded-xl p-4 text-left transition hover:scale-[1.02]"
          >
            <p className="font-bold text-white">📨 Davet Kodu ile Katıl</p>
            <p className="text-sm text-gray-400 mt-1">
              Arkadaşının gönderdiği kodu gir.
            </p>
          </button>
        </div>

        <div className="p-5 bg-[#232428]">
          <button
            onClick={onClose}
            className="w-full bg-[#404249] hover:bg-[#50535a] rounded-xl py-3 font-bold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}