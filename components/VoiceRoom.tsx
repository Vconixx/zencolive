"use client";

import { useState } from "react";
import { Room, RoomEvent } from "livekit-client";

export default function VoiceRoom({ username }: { username: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Ses odasına katılmadın");
  const [participants, setParticipants] = useState<string[]>([]);

  async function joinVoiceRoom() {
    try {
      setStatus("Ses odasına bağlanılıyor...");

      const name = username.trim() || "Anonim";

      const res = await fetch(
        `/api/livekit-token?room=genel-ses&username=${encodeURIComponent(name)}`
      );

      const data = await res.json();

      if (!data.token || !data.url) {
        throw new Error(data.error || "Token veya URL gelmedi");
      }

      const newRoom = new Room();

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        setParticipants((prev) => [...prev, participant.identity]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants((prev) =>
          prev.filter((p) => p !== participant.identity)
        );
      });

      await newRoom.connect(data.url, data.token);
      await newRoom.localParticipant.setMicrophoneEnabled(true);

      setRoom(newRoom);
      setJoined(true);
      setStatus("Genel Ses odasındasın 🎤");

      const remoteNames = Array.from(newRoom.remoteParticipants.values()).map(
        (p) => p.identity
      );

      setParticipants([name, ...remoteNames]);
    } catch (err: any) {
      console.error(err);
      alert("Ses odasına girilemedi: " + err.message);
      setStatus("Bağlantı hatası");
    }
  }

  function leaveVoiceRoom() {
    if (room) {
      room.disconnect();
    }

    setRoom(null);
    setJoined(false);
    setParticipants([]);
    setStatus("Ses odasından çıktın");
  }

  return (
    <div className="mt-6">
      <p className="text-xs text-gray-400 font-bold mb-2">SES KANALLARI</p>

      <div className="px-3 py-2 rounded bg-[#404249] text-gray-200">
        🔊 Genel Ses
      </div>

      {participants.length > 0 && (
        <div className="mt-2 ml-3 space-y-1">
          {participants.map((name) => (
            <div key={name} className="text-sm text-gray-300">
              🎤 {name}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">{status}</p>

      {!joined ? (
        <button
          onClick={joinVoiceRoom}
          className="mt-3 w-full bg-green-600 hover:bg-green-700 rounded px-3 py-2 text-sm font-bold"
        >
          Ses Odasına Katıl
        </button>
      ) : (
        <button
          onClick={leaveVoiceRoom}
          className="mt-3 w-full bg-red-600 hover:bg-red-700 rounded px-3 py-2 text-sm font-bold"
        >
          Odadan Çık
        </button>
      )}
    </div>
  );
}