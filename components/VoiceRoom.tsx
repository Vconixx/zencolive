"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
  LocalTrack,
} from "livekit-client";

export default function VoiceRoom({ username }: { username: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [status, setStatus] = useState("Ses odasına katılmadın");
  const [participants, setParticipants] = useState<string[]>([]);
  const [screenOwner, setScreenOwner] = useState("");
  const [localScreenTrack, setLocalScreenTrack] = useState<LocalTrack | null>(null);
  const [remoteScreenTrack, setRemoteScreenTrack] = useState<RemoteTrack | null>(null);

  const identityRef = useRef(`user-${Math.random().toString(36).slice(2)}`);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  useEffect(() => {
    if (localScreenTrack && localScreenVideoRef.current) {
      localScreenTrack.attach(localScreenVideoRef.current);
    }

    return () => {
      if (localScreenTrack && localScreenVideoRef.current) {
        localScreenTrack.detach(localScreenVideoRef.current);
      }
    };
  }, [localScreenTrack]);

  useEffect(() => {
    if (remoteScreenTrack && remoteScreenVideoRef.current) {
      remoteScreenTrack.attach(remoteScreenVideoRef.current);
    }

    return () => {
      if (remoteScreenTrack && remoteScreenVideoRef.current) {
        remoteScreenTrack.detach(remoteScreenVideoRef.current);
      }
    };
  }, [remoteScreenTrack]);

  function addParticipantName(name: string) {
    setParticipants((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  function removeParticipantName(name: string) {
    setParticipants((prev) => prev.filter((p) => p !== name));
  }

  function playRemoteAudio(track: RemoteTrack) {
    if (track.kind !== Track.Kind.Audio) return;

    const audioElement = track.attach() as HTMLAudioElement;
    audioElement.autoplay = true;
    audioElement.style.display = "none";

    document.body.appendChild(audioElement);
    audioElementsRef.current.push(audioElement);

    audioElement.play().catch((err) => {
      console.error("Ses oynatma hatası:", err);
    });
  }

  function removeRemoteAudio(track: RemoteTrack) {
    if (track.kind !== Track.Kind.Audio) return;

    track.detach().forEach((element) => element.remove());
    audioElementsRef.current = audioElementsRef.current.filter((el) =>
      document.body.contains(el)
    );
  }

  async function joinVoiceRoom() {
    try {
      setStatus("Ses odasına bağlanılıyor...");

      const displayName = username.trim() || "Anonim";

      const res = await fetch(
        `/api/livekit-token?room=genel-ses&username=${encodeURIComponent(
          displayName
        )}&identity=${encodeURIComponent(identityRef.current)}`
      );

      const data = await res.json();

      if (!data.token || !data.url) {
        throw new Error(data.error || "Token veya URL gelmedi");
      }

      const newRoom = new Room();

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        addParticipantName(participant.name || participant.identity);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        removeParticipantName(participant.name || participant.identity);
      });

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          if (publication.source === Track.Source.ScreenShare) {
            setRemoteScreenTrack(track);
            setScreenOwner(participant.name || participant.identity);
            return;
          }

          if (track.kind === Track.Kind.Audio) {
            playRemoteAudio(track);
          }
        }
      );

      newRoom.on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication) => {
          if (publication.source === Track.Source.ScreenShare) {
            setRemoteScreenTrack(null);
            setScreenOwner("");
            return;
          }

          if (track.kind === Track.Kind.Audio) {
            removeRemoteAudio(track);
          }
        }
      );

      await newRoom.connect(data.url, data.token);

      await newRoom.startAudio();
      await newRoom.localParticipant.setMicrophoneEnabled(true);

      setRoom(newRoom);
      setJoined(true);
      setMicEnabled(true);
      setScreenSharing(false);
      setStatus("Genel Ses odasındasın 🎤");

      const remoteNames = Array.from(newRoom.remoteParticipants.values()).map(
        (p) => p.name || p.identity
      );

      setParticipants([displayName, ...remoteNames]);
    } catch (err: any) {
      console.error(err);
      alert("Ses odasına girilemedi: " + err.message);
      setStatus("Bağlantı hatası");
    }
  }

  async function toggleMicrophone() {
    if (!room) return;

    const newMicState = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(newMicState);

    setMicEnabled(newMicState);
    setStatus(newMicState ? "Mikrofon açık 🎤" : "Mikrofon kapalı 🔇");
  }

  async function toggleScreenShare() {
    if (!room) return;

    try {
      if (!screenSharing) {
        const publication = await room.localParticipant.setScreenShareEnabled(true);
        setLocalScreenTrack(publication?.track ?? null);
        setScreenSharing(true);
        setStatus("Ekran paylaşımı açık 🖥️");
      } else {
        await room.localParticipant.setScreenShareEnabled(false);
        setLocalScreenTrack(null);
        setScreenSharing(false);
        setStatus("Ekran paylaşımı kapalı");
      }
    } catch (err: any) {
      alert("Ekran paylaşımı başlatılamadı: " + err.message);
    }
  }

  function leaveVoiceRoom() {
    if (room) room.disconnect();

    audioElementsRef.current.forEach((element) => element.remove());
    audioElementsRef.current = [];

    setRoom(null);
    setJoined(false);
    setMicEnabled(true);
    setScreenSharing(false);
    setParticipants([]);
    setScreenOwner("");
    setLocalScreenTrack(null);
    setRemoteScreenTrack(null);
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
        <div className="mt-3 space-y-2">
          <button
            onClick={toggleMicrophone}
            className={`w-full rounded px-3 py-2 text-sm font-bold ${
              micEnabled
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {micEnabled ? "🎤 Mikrofonu Kapat" : "🔇 Mikrofonu Aç"}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`w-full rounded px-3 py-2 text-sm font-bold ${
              screenSharing
                ? "bg-red-600 hover:bg-red-700"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {screenSharing ? "⛔ Paylaşımı Durdur" : "🖥️ Ekranı Paylaş"}
          </button>

          <button
            onClick={leaveVoiceRoom}
            className="w-full bg-red-600 hover:bg-red-700 rounded px-3 py-2 text-sm font-bold"
          >
            Odadan Çık
          </button>
        </div>
      )}

      {screenSharing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-[90vw] max-w-6xl bg-[#1e1f22] rounded-xl overflow-hidden border border-purple-600">
            <div className="flex items-center justify-between px-4 py-3 bg-[#232428]">
              <p className="text-sm text-white">🖥️ Sen ekran paylaşıyorsun</p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    localScreenVideoRef.current?.requestFullscreen()
                  }
                  className="text-xs bg-[#404249] hover:bg-[#50535a] px-3 py-2 rounded"
                >
                  Tam ekran
                </button>

                <button
                  onClick={toggleScreenShare}
                  className="text-xs bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
                >
                  Durdur
                </button>
              </div>
            </div>

            <video
              ref={localScreenVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full bg-black aspect-video"
            />
          </div>
        </div>
      )}

      {screenOwner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="w-[90vw] max-w-6xl bg-[#1e1f22] rounded-xl overflow-hidden border border-indigo-600">
            <div className="flex items-center justify-between px-4 py-3 bg-[#232428]">
              <p className="text-sm text-white">
                🖥️ {screenOwner} ekran paylaşıyor
              </p>

              <button
                onClick={() =>
                  remoteScreenVideoRef.current?.requestFullscreen()
                }
                className="text-xs bg-[#404249] hover:bg-[#50535a] px-3 py-2 rounded"
              >
                Tam ekran
              </button>
            </div>

            <video
              ref={remoteScreenVideoRef}
              autoPlay
              playsInline
              className="w-full bg-black aspect-video"
            />
          </div>
        </div>
      )}
    </div>
  );
}