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

  const [showScreenModal, setShowScreenModal] = useState(false);
  const [screenQuality, setScreenQuality] = useState<"720p" | "1080p">("1080p");
  const [shareScreenAudio, setShareScreenAudio] = useState(true);

  const identityRef = useRef(`user-${Math.random().toString(36).slice(2)}`);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteScreenVideoRef = useRef<HTMLVideoElement>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  async function fetchVoiceParticipants() {
    try {
      const res = await fetch("/api/livekit-participants");
      const data = await res.json();
      if (Array.isArray(data.participants)) setParticipants(data.participants);
    } catch {}
  }

  useEffect(() => {
    fetchVoiceParticipants();
    const interval = setInterval(fetchVoiceParticipants, 5000);
    return () => clearInterval(interval);
  }, []);

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

  function playRemoteAudio(track: RemoteTrack) {
    if (track.kind !== Track.Kind.Audio) return;

    const audioElement = track.attach() as HTMLAudioElement;
    audioElement.autoplay = true;
    audioElement.style.display = "none";
    document.body.appendChild(audioElement);
    audioElementsRef.current.push(audioElement);
    audioElement.play().catch(console.error);
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

      newRoom.on(RoomEvent.ParticipantConnected, fetchVoiceParticipants);
      newRoom.on(RoomEvent.ParticipantDisconnected, fetchVoiceParticipants);

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

          if (track.kind === Track.Kind.Audio) playRemoteAudio(track);
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

          if (track.kind === Track.Kind.Audio) removeRemoteAudio(track);
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

      fetchVoiceParticipants();
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

  function openScreenShareSettings() {
    if (!room) return;

    if (screenSharing) {
      stopScreenShare();
      return;
    }

    setShowScreenModal(true);
  }

  async function startScreenShare() {
    if (!room) return;

    try {
      const is1080p = screenQuality === "1080p";

      const publication = await room.localParticipant.setScreenShareEnabled(
        true,
        {
          audio: shareScreenAudio,
          resolution: is1080p
            ? {
                width: 1920,
                height: 1080,
                frameRate: 30,
              }
            : {
                width: 1280,
                height: 720,
                frameRate: 30,
              },
        },
        {
          videoEncoding: is1080p
            ? {
                maxBitrate: 8_000_000,
                maxFramerate: 30,
              }
            : {
                maxBitrate: 4_000_000,
                maxFramerate: 30,
              },
          simulcast: false,
        } as any
      );

      setLocalScreenTrack(publication?.track ?? null);
      setScreenSharing(true);
      setShowScreenModal(false);

      setStatus(
        `${screenQuality} ekran${shareScreenAudio ? " + ses" : ""} paylaşımı açık 🖥️${
          shareScreenAudio ? "🔊" : ""
        }`
      );
    } catch (err: any) {
      alert("Ekran paylaşımı başlatılamadı: " + err.message);
    }
  }

  async function stopScreenShare() {
    if (!room) return;

    await room.localParticipant.setScreenShareEnabled(false);
    setLocalScreenTrack(null);
    setScreenSharing(false);
    setStatus("Ekran paylaşımı kapalı");
  }

  function leaveVoiceRoom() {
    if (room) room.disconnect();

    audioElementsRef.current.forEach((element) => element.remove());
    audioElementsRef.current = [];

    setRoom(null);
    setJoined(false);
    setMicEnabled(true);
    setScreenSharing(false);
    setScreenOwner("");
    setLocalScreenTrack(null);
    setRemoteScreenTrack(null);
    setStatus("Ses odasından çıktın");

    setTimeout(fetchVoiceParticipants, 1000);
  }

  return (
    <div className="mt-6">
      <p className="text-xs text-gray-400 font-bold mb-2">SES KANALLARI</p>

      <div className="px-3 py-2 rounded bg-[#404249] text-gray-200">
        🔊 Genel Ses
      </div>

      {participants.length > 0 ? (
        <div className="mt-2 ml-3 space-y-1">
          {participants.map((name) => (
            <div key={name} className="text-sm text-gray-300">
              🎤 {name}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 ml-3 text-xs text-gray-500">Odada kimse yok</p>
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
            onClick={openScreenShareSettings}
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
        <div className="mt-4 bg-[#111214] rounded-xl overflow-hidden border border-purple-600">
          <div className="flex items-center justify-between px-3 py-2 bg-[#232428]">
            <p className="text-xs text-white">
              🖥️ Sen ekran paylaşıyorsun ({screenQuality})
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => localScreenVideoRef.current?.requestFullscreen()}
                className="text-xs bg-[#404249] hover:bg-[#50535a] px-2 py-1 rounded"
              >
                Tam ekran
              </button>

              <button
                onClick={stopScreenShare}
                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
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
      )}

      {screenOwner && (
        <div className="mt-4 bg-[#111214] rounded-xl overflow-hidden border border-indigo-600">
          <div className="flex items-center justify-between px-3 py-2 bg-[#232428]">
            <p className="text-xs text-white">🖥️ {screenOwner} ekran paylaşıyor</p>

            <button
              onClick={() => remoteScreenVideoRef.current?.requestFullscreen()}
              className="text-xs bg-[#404249] hover:bg-[#50535a] px-2 py-1 rounded"
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
      )}

      {showScreenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-[#1e1f22] border border-[#404249] shadow-2xl">
            <div className="px-5 py-4 border-b border-[#313338]">
              <h2 className="text-lg font-bold text-white">
                Ekran Paylaşımı Ayarları
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Yayın kalitesini ve ses paylaşımını seç.
              </p>
            </div>

            <div className="p-5 space-y-3">
              <label className="flex items-center gap-3 bg-[#2b2d31] hover:bg-[#35373d] p-3 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="screenQuality"
                  checked={screenQuality === "720p"}
                  onChange={() => setScreenQuality("720p")}
                />
                <div>
                  <p className="font-bold text-white">720p</p>
                  <p className="text-xs text-gray-400">Daha akıcı, düşük internet için iyi.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#2b2d31] hover:bg-[#35373d] p-3 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="screenQuality"
                  checked={screenQuality === "1080p"}
                  onChange={() => setScreenQuality("1080p")}
                />
                <div>
                  <p className="font-bold text-white">1080p</p>
                  <p className="text-xs text-gray-400">Daha net görüntü, daha fazla internet ister.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 bg-[#2b2d31] hover:bg-[#35373d] p-3 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareScreenAudio}
                  onChange={(e) => setShareScreenAudio(e.target.checked)}
                />
                <div>
                  <p className="font-bold text-white">Ekran sesini paylaş</p>
                  <p className="text-xs text-gray-400">
                    Chrome penceresinde ses kutusu çıkarsa onu da işaretle.
                  </p>
                </div>
              </label>
            </div>

            <div className="px-5 py-4 border-t border-[#313338] flex justify-end gap-2">
              <button
                onClick={() => setShowScreenModal(false)}
                className="px-4 py-2 rounded bg-[#404249] hover:bg-[#50535a] text-sm font-bold"
              >
                İptal
              </button>

              <button
                onClick={startScreenShare}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-sm font-bold"
              >
                Yayını Başlat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}