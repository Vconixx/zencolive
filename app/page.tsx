"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Message = {
  id: number;
  username: string;
  content: string;
  created_at: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState("Anonim");
  const [content, setContent] = useState("");

  async function getMessages() {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

 async function sendMessage() {
  if (!content.trim()) return;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      username: username || "Anonim",
      content: content,
    })
    .select()
    .single();

  if (error) {
    alert("Mesaj gönderilemedi: " + error.message);
    console.error(error);
    return;
  }

  
  setContent("");
}

  useEffect(() => {
    getMessages();

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#313338] text-white flex">
      <aside className="w-20 bg-[#1e1f22] flex flex-col items-center py-4 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-xl">
          Z
        </div>

        {["🎮", "🎧", "💬", "⚙️"].map((icon) => (
          <div
            key={icon}
            className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center text-xl cursor-pointer"
          >
            {icon}
          </div>
        ))}
      </aside>

      <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col">
        <h1 className="text-xl font-bold border-b border-[#1e1f22] pb-4">
          ZencoLive
        </h1>

        <div className="mt-4">
          <p className="text-xs text-gray-400 font-bold mb-2">
            METİN KANALLARI
          </p>

          {["genel-sohbet", "duyurular", "yardım", "oyun"].map((channel) => (
            <div
              key={channel}
              className="px-3 py-2 rounded bg-[#404249] text-gray-200 cursor-pointer"
            >
              # {channel}
            </div>
          ))}
        </div>

        <div className="mt-auto bg-[#232428] p-3 rounded">
          <input
            className="w-full bg-[#383a40] rounded px-3 py-2 text-sm outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı adın"
          />
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        <header className="h-14 bg-[#313338] border-b border-[#1e1f22] flex items-center px-6">
          <h2 className="font-bold"># genel-sohbet</h2>
        </header>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center font-bold">
                {msg.username[0]?.toUpperCase()}
              </div>

              <div>
                <p className="font-bold">
                  {msg.username}{" "}
                  <span className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleString("tr-TR")}
                  </span>
                </p>
                <p className="text-gray-300">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 flex gap-3">
          <input
            className="flex-1 bg-[#383a40] rounded-xl px-4 py-3 text-white outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder="#genel-sohbet kanalına mesaj gönder..."
          />

          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 rounded-xl font-bold"
          >
            Gönder
          </button>
        </div>
      </section>
    </main>
  );
}