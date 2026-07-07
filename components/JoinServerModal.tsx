"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  onJoined: () => void;
};

export default function JoinServerModal({
  open,
  onClose,
  userId,
  onJoined,
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function joinServer() {
    if (!code.trim()) return;

    setLoading(true);

    const { data: server } = await supabase
      .from("servers")
      .select("*")
      .eq("invite_code", code.toUpperCase())
      .single();

    if (!server) {
      alert("Geçersiz davet kodu.");
      setLoading(false);
      return;
    }

    const { data: member } = await supabase
      .from("server_members")
      .select("id")
      .eq("server_id", server.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member) {
      await supabase.from("server_members").insert({
        server_id: server.id,
        user_id: userId,
        role: "member",
      });
    }

    setLoading(false);
    onJoined();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div className="bg-[#2b2d31] rounded-xl p-6 w-[420px] border border-[#404249]">
        <h2 className="text-xl font-bold mb-2">Sunucuya Katıl</h2>

        <p className="text-sm text-gray-400 mb-4">
          Arkadaşının gönderdiği davet kodunu gir.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Örn: A8F92BCD"
          className="w-full bg-[#1e1f22] rounded-lg p-3 outline-none"
        />

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500"
          >
            İptal
          </button>

          <button
            disabled={loading}
            onClick={joinServer}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500"
          >
            {loading ? "Katılıyor..." : "Katıl"}
          </button>
        </div>
      </div>
    </div>
  );
}