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
  AudioPresets,
} from "livekit-client";

const voiceChannels = [
  { id: "genel-ses", name: "Genel Ses" },
  { id: "lol", name: "LoL" },
  { id: "cs2", name: "CS2" },
  { id: "muzik", name: "Müzik" },
];

type VoiceInfo = {
  participants: string[];
  screenSharing: boolean;
  screenOwner: string;
};

export default function VoiceRoom({ username }: { username: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [joined, setJoined] = useState(false);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState("");
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [status, setStatus] = useState("Ses kanalına katılmadın");

  const [voiceInfo, setVoiceInfo] = useState<Record<string, VoiceInfo>>({});
  const [screenOwner, setScreenOwner] = useState("");
  const [streamOpen, setStreamOpen] = useState(false);

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
      const result: Record<string, VoiceInfo> = {};

      await Promise.all(
        voiceChannels.map(async (channel) => {
          const res = await fetch(`/api/livekit-participants?room=${channel.id}`);
          const data = await res.json();

          result[channel.id] = {
            participants: Array.isArray(data.participants) ? data.participants : [],
            screenSharing: Boolean(data.screenSharing),
            screenOwner: data.screenOwner || "",
          };
        })
      );

      setVoiceInfo(result);
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
  }, [localScreenTrack, streamOpen]);

  useEffect(() => {
    if (remoteScreenTrack && remoteScreenVideoRef.current) {
      remoteScreenTrack.attach(remoteScreenVideoRef.current);
    }

    return () => {
      if (remoteScreenTrack && remoteScreenVideoRef.current) {
        remoteScreenTrack.detach(remoteScreenVideoRef.current);
      }
    };
  }, [remoteScreenTrack, streamOpen]);

  function playRemoteAudio(track: RemoteTrack) {
    if (track.kind !== Track.Kind.Audio) return;

    const audioElement = track.attach() as HTMLAudioElement;
    audioElement.autoplay = true;
    audioElement.volume = 1;
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

  function cleanupRoom() {
    if (room) room.disconnect();

    audioElementsRef.current.forEach((element) => element.remove());
    audioElementsRef.current = [];

    setRoom(null);
    setJoined(false);
    setMicEnabled(true);
    setScreenSharing(false);
    setScreenOwner("");
    setStreamOpen(false);
    setLocalScreenTrack(null);
    setRemoteScreenTrack(null);
  }

  async function joinVoiceChannel(channelId: string, channelName: string) {
    try {
      if (activeVoiceChannel === channelId && joined) {
        if (screenSharing || remoteScreenTrack) setStreamOpen(true);
        return;
      }

      cleanupRoom();
      setStatus(`${channelName} kanalına bağlanılıyor...`);

      const displayName = username.trim() || "Anonim";

      const res = await fetch(
        `/api/livekit-token?room=${channelId}&username=${encodeURIComponent(
          displayName
        )}&identity=${encodeURIComponent(identityRef.current)}`
      );

      const data = await res.json();

      if (!data.token || !data.url) {
        throw new Error(data.error || "Token veya URL gelmedi");
      }

      const newRoom = new Room({
        adaptiveStream: false,
        dynacast: false,
        publishDefaults: {
          simulcast: false,
          audioPreset: AudioPresets.musicHighQualityStereo,
          screenShareEncoding: {
            maxBitrate: 20_000_000,
            maxFramerate: 30,
          },
        },
      } as any);

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
            setStatus(`${channelName} kanalındasın · yayın var 🖥️`);
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
            setStreamOpen(false);
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
      setActiveVoiceChannel(channelId);
      setStatus(`${channelName} kanalındasın 🎤`);

      setTimeout(fetchVoiceParticipants, 1000);
    } catch (err: any) {
      console.error(err);
      alert("Ses kanalına girilemedi: " + err.message);
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
            ? { width: 1920, height: 1080, frameRate: 30 }
            : { width: 1280, height: 720, frameRate: 30 },
        },
        {
          videoEncoding: is1080p
            ? { maxBitrate: 20_000_000, maxFramerate: 30 }
            : { maxBitrate: 8_000_000, maxFramerate: 30 },
          audioPreset: AudioPresets.musicHighQualityStereo,
          dtx: false,
          red: false,
          simulcast: false,
        } as any
      );

      setLocalScreenTrack(publication?.track ?? null);
      setScreenSharing(true);
      setShowScreenModal(false);
      setStreamOpen(true);

      setStatus(
        `${screenQuality} ekran${shareScreenAudio ? " + yüksek kalite ses" : ""} paylaşımı açık 🖥️`
      );

      setTimeout(fetchVoiceParticipants, 1000);
    } catch (err: any) {
      alert("Ekran paylaşımı başlatılamadı: " + err.message);
    }
  }

  async function stopScreenShare() {
    if (!room) return;

    await room.localParticipant.setScreenShareEnabled(false);
    setLocalScreenTrack(null);
    setScreenSharing(false);
    setStreamOpen(false);
    setStatus("Ekran paylaşımı kapalı");

    setTimeout(fetchVoiceParticipants, 1000);
  }

  function leaveVoiceRoom() {
    cleanupRoom();
    setActiveVoiceChannel("");
    setStatus("Ses kanalından çıktın");
    setTimeout(fetchVoiceParticipants, 1000);
  }

  return (
    <div className="mt-6">
      <p className="text-xs text-gray-400 font-bold mb-2">SES KANALLARI</p>

      <div className="space-y-1">
        {voiceChannels.map((channel) => {
          const info = voiceInfo[channel.id];
          const names = info?.participants || [];
          const isActive = activeVoiceChannel === channel.id;
          const isLive = info?.screenSharing;

          return (
            <div key={channel.id}>
              <button
                onClick={() => joinVoiceChannel(channel.id, channel.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-gray-200 transition-all duration-200 ${
                  isActive
                    ? "bg-green-700 shadow-lg shadow-green-900/30 translate-x-1"
                    : "bg-[#404249] hover:bg-[#50525a] hover:translate-x-1"
                }`}
              >
                <span>🔊 {channel.name}</span>
                {isLive && (
                  <span className="ml-2 text-[10px] bg-red-600 px-2 py-0.5 rounded-full">
                    YAYINDA
                  </span>
                )}
              </button>

              {names.length > 0 ? (
                <div className="mt-1 mb-2 ml-4 space-y-1">
                  {names.map((name) => (
                    <div
                      key={`${channel.id}-${name}`}
                      className="text-sm text-gray-300"
                    >
                      🎤 {name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 mb-2 ml-4 text-xs text-gray-500">
                  Odada kimse yok
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">{status}</p>

      {joined && (
        <div className="mt-3 bg-[#232428] rounded-xl p-2 border border-[#3b3d44]">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={toggleMicrophone}
              title={micEnabled ? "Mikrofonu kapat" : "Mikrofonu aç"}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-105 ${
                micEnabled
                  ? "bg-[#383a40] hover:bg-yellow-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {micEnabled ? "🎤" : "🔇"}
            </button>

            <button
              onClick={openScreenShareSettings}
              title={screenSharing ? "Paylaşımı durdur" : "Ekranı paylaş"}
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-105 ${
                screenSharing
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#383a40] hover:bg-purple-600"
              }`}
            >
              {screenSharing ? "⛔" : "🖥️"}
            </button>

            {(screenSharing || remoteScreenTrack) && (
              <button
                onClick={() => setStreamOpen(true)}
                title="Yayını aç"
                className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-lg transition-all hover:scale-105"
              >
                👁️
              </button>
            )}

            <button
              onClick={leaveVoiceRoom}
              title="Odadan çık"
              className="w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 flex items-center justify-center text-lg transition-all hover:scale-105"
            >
              📞
            </button>
          </div>
        </div>
      )}

      {streamOpen && (screenSharing || remoteScreenTrack) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-6xl bg-[#111214] rounded-2xl overflow-hidden border border-indigo-600 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 bg-[#232428]">
              <p className="text-sm text-white">
                {screenSharing
                  ? `🖥️ Sen ekran paylaşıyorsun (${screenQuality})`
                  : `🖥️ ${screenOwner} yayın yapıyor`}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    (screenSharing
                      ? localScreenVideoRef.current
                      : remoteScreenVideoRef.current
                    )?.requestFullscreen()
                  }
                  className="text-xs bg-[#404249] hover:bg-[#50535a] px-3 py-2 rounded"
                >
                  Tam ekran
                </button>

                {screenSharing && (
                  <button
                    onClick={stopScreenShare}
                    className="text-xs bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
                  >
                    Yayını Durdur
                  </button>
                )}

                <button
                  onClick={() => setStreamOpen(false)}
                  className="text-xs bg-[#404249] hover:bg-[#50535a] px-3 py-2 rounded"
                >
                  Yayından Çık
                </button>
              </div>
            </div>

            {screenSharing ? (
              <video
                ref={localScreenVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full bg-black aspect-video"
              />
            ) : (
              <video
                ref={remoteScreenVideoRef}
                autoPlay
                playsInline
                className="w-full bg-black aspect-video"
              />
            )}
          </div>
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
                  <p className="text-xs text-gray-400">1280x720 - 8 Mbps</p>
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
                  <p className="text-xs text-gray-400">
                    1920x1080 - 20 Mbps yüksek kalite
                  </p>
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
                    Chrome paylaşım ekranında “Sesi de paylaş” kutusu çıkarsa
                    mutlaka işaretle. Maç/YouTube için en temiz ses genelde
                    Chrome sekmesi paylaşınca gelir.
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