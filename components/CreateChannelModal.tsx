"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (channelName: string) => void;
};

export default function CreateChannelModal({
  open,
  loading,
  onClose,
  onCreate,
}: Props) {
  const [channelName, setChannelName] = useState("");

  if (!open) return null;

  function submit() {
    if (!channelName.trim()) {
      alert("Kanal adı boş olamaz.");
      return;
    }

    onCreate(channelName.trim().replaceAll(" ", "-").toLowerCase());
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2b2d31] border border-[#404249] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e1f22]">
          <h2 className="text-2xl font-bold text-white">Kanal Oluştur</h2>
          <p className="text-sm text-gray-400 mt-1">
            Bu sunucuya yeni metin kanalı ekle.
          </p>
        </div>

        <div className="p-6">
          <label className="text-xs text-gray-400 font-bold">KANAL ADI</label>

          <div className="mt-2 flex items-center bg-[#383a40] rounded-xl px-4 border border-transparent focus-within:border-indigo-500">
            <span className="text-gray-400 mr-2">#</span>
            <input
              className="flex-1 bg-transparent py-3 outline-none text-white"
              placeholder="örnek: sohbet"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") onClose();
              }}
              autoFocus
            />
          </div>
        </div>

        <div className="p-5 bg-[#232428] flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-[#404249] hover:bg-[#50535a] rounded-xl py-3 font-bold disabled:opacity-60"
          >
            İptal
          </button>

          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl py-3 font-bold disabled:opacity-60"
          >
            {loading ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}