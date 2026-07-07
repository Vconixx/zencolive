"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import ServerSidebar from "../components/ServerSidebar";
import ChannelSidebar from "../components/ChannelSidebar";
import CreateServerModal from "../components/CreateServerModal";
import CreateChannelModal from "../components/CreateChannelModal";
import JoinServerModal from "../components/JoinServerModal";
import ServerActionModal from "../components/ServerActionModal";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

type ChannelType = "text" | "voice";

type Message = {
  id: number;
  username: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  user_id: string | null;
  channel_id: string | null;
  server_id: string | null;
  channel_uuid: string | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  role: string | null;
};

type Server = {
  id: string;
  name: string;
  owner_id: string | null;
  icon_url: string | null;
  invite_code: string | null;
};

type Channel = {
  id: string;
  server_id: string;
  name: string;
  type: string;
};

type MessageReaction = {
  id: string;
  message_id: number;
  user_id: string;
  emoji: string;
};

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 hover:underline break-all transition"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function extractFirstLink(text: string) {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function getLinkHost(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "bağlantı";
  }
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(url);
}

function getFirstImageLink(text: string) {
  const links = text.match(/https?:\/\/[^\s]+/g) || [];
  return links.find((link) => isImageUrl(link)) || null;
}

function isOnlyImageMessage(text: string) {
  const trimmed = text.trim();
  const imageLink = getFirstImageLink(trimmed);

  if (!imageLink) return false;

  return trimmed === imageLink;
}

function isXPostLink(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    return (
      (host === "x.com" || host === "twitter.com") &&
      parsed.pathname.includes("/status/")
    );
  } catch {
    return false;
  }
}

function getFirstXPostLink(text: string) {
  const links = text.match(/https?:\/\/[^\s]+/g) || [];
  return links.find((link) => isXPostLink(link)) || null;
}

function normalizeXPostLink(url: string) {
  return url.replace("https://x.com/", "https://twitter.com/");
}

function isYouTubeLink(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be"
    );
  } catch {
    return false;
  }
}

function getFirstYouTubeLink(text: string) {
  const links = text.match(/https?:\/\/[^\s]+/g) || [];
  return links.find((link) => isYouTubeLink(link)) || null;
}

function getYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return parsed.pathname.replace("/", "");
    }

    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }

    const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1];

    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];

    return null;
  } catch {
    return null;
  }
}

function Avatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "w-9 h-9" : size === "lg" ? "w-16 h-16" : "w-11 h-11";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClass} rounded-full object-cover bg-indigo-600 cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all duration-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center font-bold cursor-pointer ring-2 ring-transparent hover:ring-indigo-500 transition-all duration-200`}
    >
      {username[0]?.toUpperCase() || "Z"}
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  const [servers, setServers] = useState<Server[]>([]);
  const [textChannels, setTextChannels] = useState<Channel[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<Channel[]>([]);
  const [activeServerId, setActiveServerId] = useState("");
  const [activeChannelId, setActiveChannelId] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageReactions, setMessageReactions] = useState<MessageReaction[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentRole, setCurrentRole] = useState("user");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [toast, setToast] = useState("");
const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
const [confirmModal, setConfirmModal] = useState({
  open: false,
  title: "",
  description: "",
  confirmText: "Onayla",
  danger: false,
  onConfirm: async () => {},
});

function openConfirm({
  title,
  description,
  confirmText = "Onayla",
  danger = false,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  setConfirmModal({
    open: true,
    title,
    description,
    confirmText,
    danger,
    onConfirm: async () => {
      await onConfirm();
      setConfirmModal((prev) => ({ ...prev, open: false }));
    },
  });
}

function showToast(message: string, type: "success" | "error" | "info" = "success") {
  setToast(message);
  setToastType(type);

  setTimeout(() => {
    setToast("");
  }, 2500);
}

  const [loading, setLoading] = useState(true);
  const [serverActionOpen, setServerActionOpen] = useState(false);
  const [joinServerOpen, setJoinServerOpen] = useState(false);
  const [createServerOpen, setCreateServerOpen] = useState(false);
  const [createServerLoading, setCreateServerLoading] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [createChannelLoading, setCreateChannelLoading] = useState(false);
  const [createChannelType, setCreateChannelType] =
    useState<ChannelType>("text");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [serverNotificationSettings, setServerNotificationSettings] =
    useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const activeServer =
    servers.find((server) => server.id === activeServerId) || servers[0];

  const activeChannel =
    textChannels.find((channel) => channel.id === activeChannelId) ||
    textChannels[0];

  const activeChannelName = activeChannel?.name || "genel-sohbet";

  const canManageChannels =
    !!activeServer && activeServer.owner_id === currentUserId;

  const soundEnabled =
    activeServerId ? serverNotificationSettings[activeServerId] !== false : true;

  function setCurrentServerNotification(enabled: boolean) {
    if (!activeServerId) return;

    const nextSettings = {
      ...serverNotificationSettings,
      [activeServerId]: enabled,
    };

    setServerNotificationSettings(nextSettings);
    localStorage.setItem(
      "zencolive-server-notifications",
      JSON.stringify(nextSettings)
    );

    showToast(
      enabled
        ? `${activeServer?.name || "Sunucu"} bildirimleri açıldı.`
        : `${activeServer?.name || "Sunucu"} bildirimleri kapatıldı.`,
      "success"
    );
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
      isNearBottomRef.current = true;
      setUnreadCount(0);
    }, 100);
  }

  function handleMessagesScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 160;

    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setUnreadCount(0);
    }
  }

  function playNotificationSound() {
    if (!soundEnabled) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();

      function playTone(frequency: number, start: number, duration: number, volume: number) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
      }

      const now = audioContext.currentTime;

      // Kısa, yumuşak Discord tarzı "tuk" sesi
      playTone(520, now, 0.11, 0.045);
      playTone(780, now + 0.045, 0.13, 0.035);
    } catch {
      // Tarayıcı otomatik sesi engellerse sessiz geç.
    }
  }

  const reactionEmojis = ["👍", "😂", "❤️", "🔥", "😮", "😢"];

  function getReactionsForMessage(messageId: number) {
    return messageReactions.filter((reaction) => reaction.message_id === messageId);
  }

  function getGroupedReactions(messageId: number) {
    const reactions = getReactionsForMessage(messageId);

    return reactionEmojis
      .map((emoji) => {
        const emojiReactions = reactions.filter((reaction) => reaction.emoji === emoji);

        return {
          emoji,
          count: emojiReactions.length,
          reactedByMe: emojiReactions.some(
            (reaction) => reaction.user_id === currentUserId
          ),
        };
      })
      .filter((reaction) => reaction.count > 0);
  }

  async function getReactions(messageIds?: number[]) {
    const ids = messageIds || messages.map((message) => message.id);

    if (ids.length === 0) {
      setMessageReactions([]);
      return;
    }

    const { data, error } = await supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .in("message_id", ids);

    if (!error && data) {
      setMessageReactions(data);
    }
  }

  async function toggleReaction(messageId: number, emoji: string) {
    if (!currentUserId) return;

    const existingReaction = messageReactions.find(
      (reaction) =>
        reaction.message_id === messageId &&
        reaction.user_id === currentUserId &&
        reaction.emoji === emoji
    );

    if (existingReaction) {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (error) {
        showToast("Reaksiyon kaldırılamadı: " + error.message, "error");
        return;
      }

      setMessageReactions((prev) =>
        prev.filter((reaction) => reaction.id !== existingReaction.id)
      );

      return;
    }

    const { data, error } = await supabase
      .from("message_reactions")
      .insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      })
      .select("id, message_id, user_id, emoji")
      .single();

    if (error) {
      if (error.code === "23505") {
        await getReactions(messages.map((message) => message.id));
        return;
      }

      showToast("Reaksiyon eklenemedi: " + error.message, "error");
      return;
    }

    if (data) {
      setMessageReactions((prev) => {
        const alreadyExists = prev.some((reaction) => reaction.id === data.id);

        if (alreadyExists) return prev;

        return [...prev, data];
      });
    }
  }

  function renderMessageReactions(messageId: number) {
    const groupedReactions = getGroupedReactions(messageId);

    return (
      <div className="relative mt-1">
        {groupedReactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {groupedReactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => toggleReaction(messageId, reaction.emoji)}
                className={`h-7 rounded-full px-2.5 text-sm font-bold border transition-all duration-200 hover:scale-105 active:scale-95 ${
                  reaction.reactedByMe
                    ? "bg-indigo-600/25 border-indigo-500 text-white shadow-md shadow-indigo-900/20"
                    : "bg-[#232428] border-[#404249] text-gray-200 hover:border-indigo-500"
                }`}
                title="Reaksiyon"
              >
                <span className="mr-1">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="pointer-events-none absolute -top-10 left-0 z-20 opacity-0 translate-y-1 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <div className="flex items-center gap-1 rounded-full bg-[#1f2026] border border-[#404249] px-2 py-1 shadow-xl">
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(messageId, emoji)}
                className="w-7 h-7 rounded-full hover:bg-[#3a3c43] transition-all duration-200 hover:scale-125 active:scale-95"
                title={`${emoji} ekle`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function getProfileForMessage(msg: Message) {
    if (msg.user_id) return profiles.find((p) => p.id === msg.user_id) || null;
    return profiles.find((p) => p.username === msg.username) || null;
  }

  async function checkUser() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setCurrentUserId(data.user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, banner_url, role")
      .eq("id", data.user.id)
      .single();

    const name =
      profile?.username ||
      data.user.user_metadata?.username ||
      data.user.email?.split("@")[0] ||
      "Kullanıcı";

    setUsername(name);
    setAvatarUrl(profile?.avatar_url || null);
    setCurrentRole(profile?.role || "user");
    setLoading(false);
  }

  async function getServers() {
    if (!currentUserId) return;

    const { data: memberships } = await supabase
      .from("server_members")
      .select("server_id")
      .eq("user_id", currentUserId);

    const memberServerIds = (memberships || []).map((m) => m.server_id);

    const { data, error } = await supabase
      .from("servers")
      .select("id, name, owner_id, icon_url, invite_code")
      .order("created_at", { ascending: true });

    if (!error && data) {
      const visibleServers = data.filter(
        (server) =>
          server.owner_id === currentUserId || memberServerIds.includes(server.id)
      );

      setServers(visibleServers);

      if (!activeServerId && visibleServers.length > 0) {
        setActiveServerId(visibleServers[0].id);
      }

      if (
        activeServerId &&
        !visibleServers.some((server) => server.id === activeServerId)
      ) {
        setActiveServerId(visibleServers[0]?.id || "");
      }
    }
  }

  async function getChannels(serverId: string) {
    const { data, error } = await supabase
      .from("channels")
      .select("id, server_id, name, type")
      .eq("server_id", serverId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const texts = data.filter((c) => c.type === "text");
      const voices = data.filter((c) => c.type === "voice");

      setTextChannels(texts);
      setVoiceChannels(voices);
      setActiveChannelId(texts[0]?.id || "");
    }
  }

  async function createDefaultChannels(serverId: string) {
    await supabase.from("channels").insert([
      {
        server_id: serverId,
        name: "genel-sohbet",
        type: "text",
      },
      {
        server_id: serverId,
        name: "genel-ses",
        type: "voice",
      },
    ]);
  }

  async function createServer(serverName: string) {
    if (!currentUserId) return;

    setCreateServerLoading(true);

    const { data: serverData, error: serverError } = await supabase
      .from("servers")
      .insert({
        name: serverName,
        owner_id: currentUserId,
        icon_url: null,
        invite_code: generateInviteCode(),
      })
      .select("id, name, owner_id, icon_url, invite_code")
      .single();

    if (serverError || !serverData) {
      setCreateServerLoading(false);
      showToast("Sunucu oluşturulamadı: " + serverError?.message, "error");
      return;
    }

    const { error: memberError } = await supabase.from("server_members").insert({
      server_id: serverData.id,
      user_id: currentUserId,
      role: "owner",
    });

    if (memberError) {
      setCreateServerLoading(false);
      showToast("Sunucu üyeliği oluşturulamadı: " + memberError.message, "error");
      return;
    }

    await createDefaultChannels(serverData.id);

    setServers((prev) => [...prev, serverData]);
    setActiveServerId(serverData.id);
    setCreateServerOpen(false);
    setCreateServerLoading(false);

    showToast("Sunucu oluşturuldu.", "success");
    await getChannels(serverData.id);
  }

  function openCreateChannel(type: ChannelType) {
    setCreateChannelType(type);
    setCreateChannelOpen(true);
  }

  async function createChannel(channelName: string) {
    if (!activeServerId) return;

    if (!canManageChannels) {
      showToast("Kanal oluşturma yetkin yok.", "error");
      return;
    }

    setCreateChannelLoading(true);

    const { data, error } = await supabase
      .from("channels")
      .insert({
        server_id: activeServerId,
        name: channelName,
        type: createChannelType,
      })
      .select("id, server_id, name, type")
      .single();

    setCreateChannelLoading(false);

    if (error || !data) {
      showToast("Kanal oluşturulamadı: " + error?.message, "error");
      return;
    }

    if (createChannelType === "text") {
      setTextChannels((prev) => [...prev, data]);
      setActiveChannelId(data.id);
      setMessages([]);
      showToast(`#${data.name} metin kanalı oluşturuldu.`, "success");
    } else {
      setVoiceChannels((prev) => [...prev, data]);
      showToast(`🔊 ${data.name} ses kanalı oluşturuldu.`, "success");
    }

    setCreateChannelOpen(false);
    setContent("");
    setEditingId(null);
  }

  async function deleteTextChannel(channelId: string, channelName: string) {
    if (!canManageChannels) {
      showToast("Kanal silme yetkin yok.", "error");
      return;
    }

    if (textChannels.length <= 1) {
      showToast("Son metin kanalını silemezsin.", "error");
      return;
    }

    openConfirm({
      title: "Metin kanalı silinsin mi?",
      description: `#${channelName} kanalı kalıcı olarak silinecek.`,
      confirmText: "Kanalı Sil",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("channels")
          .delete()
          .eq("id", channelId);

        if (error) {
          showToast("Kanal silinemedi: " + error.message, "error");
          return;
        }

        const remaining = textChannels.filter((c) => c.id !== channelId);
        setTextChannels(remaining);

        if (activeChannelId === channelId) {
          setActiveChannelId(remaining[0]?.id || "");
          setMessages([]);
        }

        showToast(`#${channelName} kanalı silindi.`, "success");
      },
    });
  }

  async function deleteVoiceChannel(channelId: string, channelName: string) {
    if (!canManageChannels) {
      showToast("Ses kanalı silme yetkin yok.", "error");
      return;
    }

    if (voiceChannels.length <= 1) {
      showToast("Son ses kanalını silemezsin.", "error");
      return;
    }

    openConfirm({
      title: "Ses kanalı silinsin mi?",
      description: `🔊 ${channelName} ses kanalı kalıcı olarak silinecek.`,
      confirmText: "Ses Kanalını Sil",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("channels")
          .delete()
          .eq("id", channelId);

        if (error) {
          showToast("Ses kanalı silinemedi: " + error.message, "error");
          return;
        }

        setVoiceChannels((prev) => prev.filter((c) => c.id !== channelId));
        showToast(`🔊 ${channelName} ses kanalı silindi.`, "success");
      },
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function getProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, banner_url, role");

    if (data) setProfiles(data);
  }

  async function getMessages() {
    if (!activeServerId || !activeChannelId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, username, content, created_at, edited_at, user_id, channel_id, server_id, channel_uuid"
      )
      .eq("server_id", activeServerId)
      .eq("channel_uuid", activeChannelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      await getReactions(data.map((message) => message.id));
      scrollToBottom("auto");
    }
  }

  async function uploadMessageFile(file: File) {
    if (!activeServerId || !activeChannelId) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      showToast("Şimdilik sadece resim yükleyebilirsin.", "error");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast("Resim en fazla 20 MB olabilir.", "error");
      return;
    }

    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${activeServerId}/${activeChannelId}/${fileName}`;

    showToast("Resim yükleniyor...", "info");

    const { error: uploadError } = await supabase.storage
      .from("message-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      showToast("Resim yüklenemedi: " + uploadError.message, "error");
      return;
    }

    const { data } = supabase.storage.from("message-files").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: messageError } = await supabase.from("messages").insert({
      username,
      user_id: currentUserId,
      server_id: activeServerId,
      channel_uuid: activeChannelId,
      channel_id: activeChannelName,
      content: publicUrl,
    });

    if (messageError) {
      showToast("Resim mesaja eklenemedi: " + messageError.message, "error");
      return;
    }

    showToast("Resim gönderildi.", "success");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (!imageItem) return;

    const file = imageItem.getAsFile();

    if (!file) return;

    e.preventDefault();
    uploadMessageFile(file);
  }

  async function sendMessage() {
    if (!content.trim()) return;
    if (!activeServerId || !activeChannelId) return;

    const { error } = await supabase.from("messages").insert({
      username,
      user_id: currentUserId,
      server_id: activeServerId,
      channel_uuid: activeChannelId,
      channel_id: activeChannelName,
      content,
    });

    if (error) {
      showToast("Mesaj gönderilemedi: " + error.message, "error");
      return;
    }

    setContent("");
  }

  async function deleteMessage(msg: Message) {
    const canDelete = msg.user_id === currentUserId || currentRole === "admin";

    if (!canDelete) {
      showToast("Bu mesajı silme yetkin yok.", "error");
      return;
    }

    openConfirm({
      title: "Mesaj silinsin mi?",
      description: "Bu mesaj kalıcı olarak silinecek.",
      confirmText: "Mesajı Sil",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("messages")
          .delete()
          .eq("id", msg.id);

        if (error) {
          showToast("Mesaj silinemedi: " + error.message, "error");
          return;
        }

        showToast("Mesaj silindi.", "success");
      },
    });
  }

  async function saveEdit(msg: Message) {
    if (msg.user_id !== currentUserId) {
      showToast("Sadece kendi mesajını düzenleyebilirsin.", "error");
      return;
    }

    if (!editingContent.trim()) return;

    const { error } = await supabase
      .from("messages")
      .update({
        content: editingContent,
        edited_at: new Date().toISOString(),
      })
      .eq("id", msg.id);

    if (error) {
      showToast("Mesaj düzenlenemedi: " + error.message, "error");
      return;
    }

    setEditingId(null);
    setEditingContent("");
  }

  function startEdit(msg: Message) {
    if (msg.user_id !== currentUserId) return;

    setEditingId(msg.id);
    setEditingContent(msg.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent("");
  }

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("zencolive-server-notifications");

      if (savedSettings) {
        setServerNotificationSettings(JSON.parse(savedSettings));
      }
    } catch {
      setServerNotificationSettings({});
    }
  }, []);

  useEffect(() => {
    if (currentUserId) getServers();
  }, [currentUserId]);

  useEffect(() => {
    if (activeServerId) {
      getChannels(activeServerId);
      setEditingId(null);
      setContent("");
      setMessages([]);
      setMessageReactions([]);
    }
  }, [activeServerId]);

  useEffect(() => {
    setUnreadCount(0);
    isNearBottomRef.current = true;
    getMessages();
  }, [activeServerId, activeChannelId]);

  useEffect(() => {
    getProfiles();

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMessage = payload.new as Message;

            if (
              newMessage.server_id === activeServerId &&
              newMessage.channel_uuid === activeChannelId
            ) {
              const ownMessage = newMessage.user_id === currentUserId;
              const shouldScroll = isNearBottomRef.current || ownMessage;

              setMessages((prev) => [...prev, newMessage]);

              if (shouldScroll) {
                scrollToBottom("smooth");
              } else {
                setUnreadCount((prev) => prev + 1);
              }

              if (!ownMessage) {
                playNotificationSound();
              }
            }
          }

          if (payload.eventType === "UPDATE") {
            const updatedMessage = payload.new as Message;

            if (
              updatedMessage.server_id !== activeServerId ||
              updatedMessage.channel_uuid !== activeChannelId
            ) {
              return;
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }

          if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== payload.old.id)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newReaction = payload.new as MessageReaction;

            setMessageReactions((prev) => {
              const alreadyExists = prev.some(
                (reaction) => reaction.id === newReaction.id
              );

              if (alreadyExists) return prev;

              return [...prev, newReaction];
            });
          }

          if (payload.eventType === "DELETE") {
            const oldReaction = payload.old as MessageReaction;

            setMessageReactions((prev) =>
              prev.filter((reaction) => reaction.id !== oldReaction.id)
            );
          }
        }
      )
      .subscribe();

    const profileInterval = setInterval(getProfiles, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(profileInterval);
    };
  }, [activeServerId, activeChannelId, currentUserId, soundEnabled]);

  useEffect(() => {
    const hasXPost = messages.some((msg) => getFirstXPostLink(msg.content));

    if (!hasXPost) return;

    const existingScript = document.querySelector(
      'script[src="https://platform.twitter.com/widgets.js"]'
    );

    function loadWidgets() {
      const twitterWindow = window as typeof window & {
        twttr?: {
          widgets?: {
            load: () => void;
          };
        };
      };

      twitterWindow.twttr?.widgets?.load();
    }

    if (existingScript) {
      loadWidgets();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = loadWidgets;

    document.body.appendChild(script);
  }, [messages]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#313338] text-white flex items-center justify-center">
        <p>Yükleniyor...</p>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        .zenco-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .zenco-scroll::-webkit-scrollbar-track {
          background: #2b2d31;
          border-radius: 999px;
        }

        .zenco-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6366f1, #9333ea);
          border-radius: 999px;
          border: 2px solid #2b2d31;
        }

        .zenco-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #818cf8, #a855f7);
        }

        .zenco-scroll {
          scrollbar-width: thin;
          scrollbar-color: #7c3aed #2b2d31;
        }

        .zenco-x-embed iframe {
          max-width: 330px !important;
          width: 330px !important;
        }

        .zenco-x-embed .twitter-tweet,
        .zenco-x-embed twitter-widget {
          max-width: 330px !important;
          width: 330px !important;
          margin: 0 !important;
        }
      `}</style>

      <main className="min-h-screen bg-[#313338] text-white flex">
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          onSelectServer={(serverId) => {
            setActiveServerId(serverId);
            setActiveChannelId("");
            setEditingId(null);
            setContent("");
          }}
          onCreateServer={() => setServerActionOpen(true)}
          onOpenSettings={() => router.push("/settings")}
        />

        <ChannelSidebar
  activeServer={activeServer}
  textChannels={textChannels}
  voiceChannels={voiceChannels}
  activeChannelId={activeChannelId}
  username={username}
  avatarUrl={avatarUrl}
  currentRole={currentRole}
  canManageChannels={canManageChannels}
  isOwner={activeServer?.owner_id === currentUserId}
  inviteCode={activeServer?.invite_code}
  onCopyInvite={() => {
    if (!activeServer?.invite_code) return;
    navigator.clipboard.writeText(activeServer.invite_code);
    showToast("Davet kodu kopyalandı: " + activeServer.invite_code, "success");
  }}
  onRegenerateInvite={async () => {
    if (!activeServer) return;

    const newCode = generateInviteCode();

    const { error } = await supabase
      .from("servers")
      .update({ invite_code: newCode })
      .eq("id", activeServer.id);

    if (error) {
      showToast("Davet kodu yenilenemedi.", "error");
      return;
    }

    setServers((prev) =>
      prev.map((server) =>
        server.id === activeServer.id
          ? { ...server, invite_code: newCode }
          : server
      )
    );

    showToast("Yeni davet kodu oluşturuldu: " + newCode, "success");
  }}
  onLeaveServer={() => {
    if (!activeServer) return;

    openConfirm({
      title: "Sunucudan ayrıl?",
      description: `${activeServer.name} sunucusundan ayrılacaksın. Tekrar katılmak için davet kodu gerekir.`,
      confirmText: "Ayrıl",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("server_members")
          .delete()
          .eq("server_id", activeServer.id)
          .eq("user_id", currentUserId);

        if (error) {
          showToast("Sunucudan ayrılamadın.", "error");
          return;
        }

        showToast("Sunucudan ayrıldın.", "success");
        setActiveServerId("");
        setActiveChannelId("");
        setMessages([]);
        await getServers();
      },
    });
  }}
  onDeleteServer={() => {
    if (!activeServer) return;

    openConfirm({
      title: "Sunucu silinsin mi?",
      description: `${activeServer.name} sunucusu kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmText: "Sunucuyu Sil",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase
          .from("servers")
          .delete()
          .eq("id", activeServer.id);

        if (error) {
          showToast("Sunucu silinemedi.", "error");
          return;
        }

        showToast("Sunucu silindi.", "success");
        setActiveServerId("");
        setActiveChannelId("");
        setMessages([]);
        await getServers();
      },
    });
  }}
  onCreateTextChannel={() => openCreateChannel("text")}
  onCreateVoiceChannel={() => openCreateChannel("voice")}
  onDeleteTextChannel={deleteTextChannel}
  onDeleteVoiceChannel={deleteVoiceChannel}
  onSelectChannel={(channelId) => {
    setActiveChannelId(channelId);
    setEditingId(null);
    setContent("");
    setUnreadCount(0);
    isNearBottomRef.current = true;
  }}
  onLogout={logout}
/>

        <section className="flex-1 flex flex-col h-screen">
          <header className="h-14 bg-[#313338]/95 backdrop-blur border-b border-[#1e1f22] flex items-center px-6 shadow-sm">
            <h2 className="font-bold"># {activeChannelName}</h2>

            <button
              onClick={() => setCurrentServerNotification(!soundEnabled)}
              className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                soundEnabled
                  ? "bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30"
                  : "bg-[#404249] text-gray-300 hover:bg-[#50535a]"
              }`}
              title="Bu sunucunun bildirim sesi"
            >
              {soundEnabled ? "🔔 Bu Sunucuda Açık" : "🔕 Bu Sunucuda Kapalı"}
            </button>
          </header>

          <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="zenco-scroll flex-1 p-5 space-y-0.5 overflow-y-auto scroll-smooth">
            {messages.map((msg) => {
              const profile = getProfileForMessage(msg);
              const displayName = profile?.username || msg.username || "Anonim";
              const displayAvatar = profile?.avatar_url || null;

              const canEdit = msg.user_id === currentUserId;
              const canDelete =
                msg.user_id === currentUserId || currentRole === "admin";

              return (
                <div
                  key={msg.id}
                  className="group relative flex gap-4 rounded-xl px-3 py-1.5 transition-all duration-200 hover:bg-[#2b2d31]"
                >
                  <div onClick={() => profile && setSelectedProfile(profile)}>
                    <Avatar username={displayName} avatarUrl={displayAvatar} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => profile && setSelectedProfile(profile)}
                        className="font-bold hover:underline"
                      >
                        {displayName}
                      </button>

                      <span className="text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleString("tr-TR")}
                        {msg.edited_at && " · düzenlendi"}
                      </span>

                      {(canEdit || canDelete) && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2 ml-2 transition-opacity duration-200">
                          {canEdit && (
                            <button
                              onClick={() => startEdit(msg)}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Düzenle
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => deleteMessage(msg)}
                              className="text-xs text-red-400 hover:underline"
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {editingId === msg.id ? (
                      <div className="mt-2">
                        <input
                          className="w-full bg-[#383a40] rounded-xl px-3 py-2 text-white outline-none border border-indigo-600/40"
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(msg);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />

                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => saveEdit(msg)}
                            className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                          >
                            Kaydet
                          </button>

                          <button
                            onClick={cancelEdit}
                            className="text-xs bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded"
                          >
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {!isOnlyImageMessage(msg.content) && (
                          <p className="text-gray-300 leading-relaxed break-words">
                            {linkifyText(msg.content)}
                          </p>
                        )}

                        {getFirstImageLink(msg.content) && (
                          <button
                            type="button"
                            onClick={() => setSelectedImageUrl(getFirstImageLink(msg.content))}
                            className="mt-3 block w-fit max-w-[360px] rounded-2xl border border-[#404249] bg-[#111214] overflow-hidden hover:border-indigo-500/70 transition-all duration-200 shadow-lg shadow-black/20 text-left"
                            title="Resmi büyüt"
                          >
                            <img
                              src={getFirstImageLink(msg.content) || ""}
                              alt="Resim önizlemesi"
                              className="max-h-[280px] max-w-[360px] object-contain bg-black"
                              loading="lazy"
                            />

                            {!isOnlyImageMessage(msg.content) && (
                              <div className="px-4 py-3 bg-[#232428]">
                                <p className="text-xs text-indigo-300 font-bold uppercase tracking-wide">
                                  Resim Önizlemesi
                                </p>
                                <p className="text-sm text-gray-400 mt-1 break-all">
                                  {getFirstImageLink(msg.content)}
                                </p>
                              </div>
                            )}
                          </button>
                        )}

                        {getFirstYouTubeLink(msg.content) &&
                          getYouTubeVideoId(getFirstYouTubeLink(msg.content) || "") && (
                            <div className="mt-3 w-fit max-w-[370px] rounded-2xl border border-[#404249] bg-[#111214] overflow-hidden shadow-lg shadow-black/20">
                              <div className="h-1 bg-gradient-to-r from-red-600 to-red-400" />

                              <div className="p-3">
                                <p className="text-xs text-red-300 font-bold uppercase tracking-wide mb-2">
                                  
                                </p>

                                <iframe
                                  className="w-[400px] max-w-full aspect-video rounded-xl bg-black"
                                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(
                                    getFirstYouTubeLink(msg.content) || ""
                                  )}`}
                                  title="YouTube video önizlemesi"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          )}

                        {getFirstXPostLink(msg.content) && (
                          <div className="zenco-x-embed mt-3 w-fit max-w-[360px] max-h-[430px] rounded-2xl border border-[#404249] bg-[#111214] p-2 overflow-hidden shadow-lg shadow-black/20">
                            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wide mb-2">
                              
                            </p>

                            <blockquote
                              className="twitter-tweet" data-width="400"
                              data-theme="dark"
                              data-dnt="true"
                            >
                              <a href={normalizeXPostLink(getFirstXPostLink(msg.content) || "")}>
                                {normalizeXPostLink(getFirstXPostLink(msg.content) || "")}
                              </a>
                            </blockquote>
                          </div>
                        )}

                        {extractFirstLink(msg.content) &&
                          !getFirstImageLink(msg.content) &&
                          !getFirstXPostLink(msg.content) &&
                          !getFirstYouTubeLink(msg.content) && (
                          <a
                            href={extractFirstLink(msg.content) || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 block max-w-[420px] rounded-2xl border border-[#404249] bg-[#232428] overflow-hidden hover:border-indigo-500/70 hover:bg-[#292b31] transition-all duration-200 hover:translate-x-1 shadow-lg shadow-black/10"
                          >
                            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />

                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-xl bg-indigo-600/20 flex items-center justify-center text-xl">
                                  🔗
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-wide">
                                    
                                  </p>

                                  <p className="text-white font-bold mt-1 truncate">
                                    {getLinkHost(extractFirstLink(msg.content) || "")}
                                  </p>

                                  <p className="text-sm text-gray-400 mt-1 break-all line-clamp-2">
                                    {extractFirstLink(msg.content)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </a>
                        )}

                        {renderMessageReactions(msg.id)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {unreadCount > 0 && (
            <div className="px-5 pb-3 bg-[#313338]/95">
              <button
                onClick={() => scrollToBottom("smooth")}
                className="mx-auto block rounded-full bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-black shadow-lg shadow-indigo-900/40 transition-all duration-200 hover:scale-[1.03]"
              >
                {unreadCount} yeni mesaj ↓
              </button>
            </div>
          )}

          <div className="p-5 bg-[#313338]/95 backdrop-blur border-t border-[#1e1f22]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMessageFile(file);
                setAttachmentMenuOpen(false);
              }}
            />

            <div className="relative flex items-center gap-3 rounded-2xl bg-[#383a40] border border-[#45474f] px-3 py-3 shadow-lg shadow-black/10 focus-within:border-indigo-500 transition-all duration-200">
              {attachmentMenuOpen && (
                <div className="absolute bottom-[64px] left-0 w-64 rounded-2xl bg-[#1f2026] border border-white/10 shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out] z-50">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-indigo-600 transition-all"
                    >
                      <span className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-xl">
                        📷
                      </span>

                      <div>
                        <p className="font-bold text-sm text-white">Resim Yükle</p>
                        <p className="text-xs text-gray-400">PNG, JPG, GIF, WEBP</p>
                      </div>
                    </button>

                    <button
                      onClick={() => showToast("Dosya gönderme yakında eklenecek.", "info")}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#2b2d31] transition-all opacity-70"
                    >
                      <span className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-xl">
                        📁
                      </span>

                      <div>
                        <p className="font-bold text-sm text-white">Dosya Gönder</p>
                        <p className="text-xs text-gray-400">Yakında</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setAttachmentMenuOpen((prev) => !prev)}
                title="Ekle"
                className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl font-black transition-all duration-200 active:scale-95 ${
                  attachmentMenuOpen
                    ? "bg-indigo-600 rotate-45 shadow-lg shadow-indigo-900/40"
                    : "bg-[#2b2d31] hover:bg-indigo-600 hover:rotate-90"
                }`}
              >
                +
              </button>

              <input
                className="flex-1 bg-transparent px-1 py-2 text-white outline-none placeholder:text-gray-400"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                  if (e.key === "Escape") setAttachmentMenuOpen(false);
                }}
                placeholder={`#${activeChannelName} kanalına mesaj gönder...`}
              />

              <button
                onClick={() => showToast("Emoji sistemi yakında eklenecek.", "info")}
                title="Emoji"
                className="w-10 h-10 rounded-xl hover:bg-[#4b4d55] flex items-center justify-center text-xl transition-all duration-200 hover:scale-110 active:scale-95"
              >
                😊
              </button>

              <button
                onClick={sendMessage}
                className="bg-indigo-600 hover:bg-indigo-700 px-5 h-11 rounded-xl font-bold transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-lg shadow-indigo-900/30"
              >
                Gönder
              </button>
            </div>
          </div>
        </section>

        {selectedProfile && (
          <div
            onClick={() => setSelectedProfile(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#2b2d31] rounded-2xl overflow-hidden border border-[#404249] shadow-2xl animate-[fadeIn_0.15s_ease-out]"
            >
              <div
                className="h-32 bg-gradient-to-r from-indigo-600 to-purple-700 bg-cover bg-center"
                style={
                  selectedProfile.banner_url
                    ? { backgroundImage: `url(${selectedProfile.banner_url})` }
                    : undefined
                }
              />

              <div className="p-5">
                <div className="-mt-14 mb-4">
                  <Avatar
                    username={selectedProfile.username}
                    avatarUrl={selectedProfile.avatar_url}
                    size="lg"
                  />
                </div>

                <h2 className="text-2xl font-bold">
                  {selectedProfile.username}
                </h2>
                <p className="text-sm text-green-400 mt-1">
                  {selectedProfile.role === "admin" ? "Admin" : "Çevrimiçi"}
                </p>

                <div className="mt-5 bg-[#232428] rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-bold mb-1">
                    ZENCOLIVE PROFİLİ
                  </p>
                  <p className="text-sm text-gray-300">
                    Henüz hakkında bilgisi yok.
                  </p>
                </div>

                <button
                  onClick={() => setSelectedProfile(null)}
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2 font-bold transition-all duration-200 hover:scale-[1.02]"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedImageUrl && (
          <div
            onClick={() => setSelectedImageUrl(null)}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-[96vw] max-h-[94vh] rounded-2xl border border-[#404249] bg-[#111214] shadow-2xl animate-[fadeIn_0.15s_ease-out] flex items-center justify-center"
            >
              <button
                onClick={() => setSelectedImageUrl(null)}
                className="absolute -top-4 -right-4 z-10 w-11 h-11 rounded-full bg-[#1f2026] hover:bg-red-600 text-white font-black transition border border-white/10 shadow-xl"
                title="Kapat"
              >
                ✕
              </button>

              <img
                src={selectedImageUrl}
                alt="Büyük resim"
                className="max-w-[94vw] max-h-[92vh] object-contain rounded-2xl bg-black cursor-zoom-out"
                onClick={() => setSelectedImageUrl(null)}
              />
            </div>
          </div>
        )}

        <ServerActionModal
          open={serverActionOpen}
          onClose={() => setServerActionOpen(false)}
          onCreateServer={() => setCreateServerOpen(true)}
          onJoinServer={() => setJoinServerOpen(true)}
        />

        <JoinServerModal
          open={joinServerOpen}
          onClose={() => setJoinServerOpen(false)}
          userId={currentUserId}
          onJoined={getServers}
        />

        <CreateServerModal
          open={createServerOpen}
          loading={createServerLoading}
          onClose={() => setCreateServerOpen(false)}
          onCreate={createServer}
        />

        <CreateChannelModal
          open={createChannelOpen}
          loading={createChannelLoading}
          channelType={createChannelType}
          onClose={() => setCreateChannelOpen(false)}
          onCreate={createChannel}
        />
        <ConfirmModal
  open={confirmModal.open}
  title={confirmModal.title}
  description={confirmModal.description}
  confirmText={confirmModal.confirmText}
  cancelText="Vazgeç"
  danger={confirmModal.danger}
  onConfirm={confirmModal.onConfirm}
  onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
/>
        <Toast message={toast} type={toastType} />
      </main>
    </>
  );
}