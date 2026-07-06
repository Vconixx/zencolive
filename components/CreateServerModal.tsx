"use client";

import { useState } from "react";

type CreateServerModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (serverName: string) => void;
};

export default function CreateServerModal({
  open,
  loading,
  onClose,
  onCreate,
}: CreateServerModalProps) {
  const [serverName, setServerName] = useState("");

  if (!open) return null;

  function submit() {
    if (!serverName.trim()) {
      alert("Sunucu adı boş olamaz.");
      return;
    }

    onCreate(serverName.trim());
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2b2d31] border border-[#404249] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e1f22]">
          <h2 className="text-2xl font-bold text-white">Sunucu Oluştur</h2>
          <p className="text-sm text-gray-400 mt-1">
            Yeni bir ZencoLive sunucusu oluştur.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-4xl font-bold">
            {serverName[0]?.toUpperCase() || "Z"}
          </div>

          <input
            className="w-full bg-[#383a40] rounded-xl px-4 py-3 outline-none border border-transparent focus:border-indigo-500"
            placeholder="Sunucu adı"
            value={serverName}
            onChange={(e) => setServerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
            }}
            autoFocus
          />
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