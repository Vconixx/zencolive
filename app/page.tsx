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
  reply_to_id: number | null;
  pinned: boolean | null;
  pinned_at: string | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  role: string | null;
  about: string | null;
  status: string | null;
  profile_color: string | null;
  created_at: string | null;
  last_seen: string | null;
  manual_status: string | null;
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

type FriendRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
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

function getStatusInfo(status?: string | null) {
  if (status === "idle") {
    return {
      label: "Boşta",
      icon: "🌙",
      dotClass: "bg-yellow-400",
      textClass: "text-yellow-300",
    };
  }

  if (status === "dnd") {
    return {
      label: "Rahatsız Etmeyin",
      icon: "⛔",
      dotClass: "bg-red-500",
      textClass: "text-red-300",
    };
  }

  if (status === "invisible") {
    return {
      label: "Görünmez",
      icon: "⚫",
      dotClass: "bg-gray-500",
      textClass: "text-gray-300",
    };
  }

  return {
    label: "Çevrimiçi",
    icon: "🟢",
    dotClass: "bg-green-500",
    textClass: "text-green-400",
  };
}

function isProfileOnline(profile?: Profile | null) {
  if (!profile) return false;

  if (profile.manual_status === "invisible" || profile.status === "invisible") {
    return false;
  }

  if (!profile.last_seen) return false;

  const lastSeenTime = new Date(profile.last_seen).getTime();

  if (Number.isNaN(lastSeenTime)) return false;

  return Date.now() - lastSeenTime < 25 * 1000;
}

function getDisplayStatus(profile?: Profile | null) {
  if (!profile) return "offline";

  if (!isProfileOnline(profile)) return "offline";

  return profile.manual_status || profile.status || "online";
}

function getProfileStatusInfo(profile?: Profile | null) {
  const status = getDisplayStatus(profile);

  if (status === "offline") {
    return {
      label: "Çevrimdışı",
      icon: "⚫",
      dotClass: "bg-gray-500",
      textClass: "text-gray-300",
    };
  }

  return getStatusInfo(status);
}

function getSafeProfileColor(color?: string | null) {
  return color || "#6366f1";
}

function formatJoinDate(date?: string | null) {
  if (!date) return "Bilinmiyor";

  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
  const [currentAbout, setCurrentAbout] = useState("");
  const [currentStatus, setCurrentStatus] = useState("online");
  const [currentProfileColor, setCurrentProfileColor] = useState("#6366f1");
  const [currentLastSeen, setCurrentLastSeen] = useState<string | null>(null);
  const [currentManualStatus, setCurrentManualStatus] = useState("online");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<number | null>(null);
  const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false);
  const [appView, setAppView] = useState<"server" | "friends">("server");
  const [friendsTab, setFriendsTab] = useState<"online" | "all" | "pending" | "add">("all");
  const [selectedDmProfileId, setSelectedDmProfileId] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<Profile[]>([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
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

  const pinnedMessages = messages
    .filter((message) => message.pinned)
    .sort((a, b) => {
      const aTime = a.pinned_at ? new Date(a.pinned_at).getTime() : 0;
      const bTime = b.pinned_at ? new Date(b.pinned_at).getTime() : 0;

      return bTime - aTime;
    });

  const acceptedFriends = friends.filter((friend) => friend.status === "accepted");

  const incomingFriendRequests = friends.filter(
    (friend) => friend.status === "pending" && friend.receiver_id === currentUserId
  );

  const outgoingFriendRequests = friends.filter(
    (friend) => friend.status === "pending" && friend.sender_id === currentUserId
  );

  function getFriendProfile(friend: FriendRow) {
    const friendId =
      friend.sender_id === currentUserId ? friend.receiver_id : friend.sender_id;

    return profiles.find((profile) => profile.id === friendId) || null;
  }

  const friendProfiles = acceptedFriends
    .map((friend) => ({
      friend,
      profile: getFriendProfile(friend),
    }))
    .filter((item) => item.profile)
    .sort((a, b) => {
      const aOnline = isProfileOnline(a.profile) ? 1 : 0;
      const bOnline = isProfileOnline(b.profile) ? 1 : 0;

      if (aOnline !== bOnline) return bOnline - aOnline;

      return (a.profile?.username || "").localeCompare(
        b.profile?.username || "",
        "tr"
      );
    });

  const canManageChannels =
    !!activeServer && activeServer.owner_id === currentUserId;

  const currentProfileForStatus =
    profiles.find((profile) => profile.id === currentUserId) || null;

  const currentDisplayStatus =
    currentProfileForStatus
      ? getDisplayStatus(currentProfileForStatus)
      : currentManualStatus || currentStatus;

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

    const myCurrentReaction = messageReactions.find(
      (reaction) =>
        reaction.message_id === messageId && reaction.user_id === currentUserId
    );

    if (myCurrentReaction?.emoji === emoji) {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", myCurrentReaction.id);

      if (error) {
        showToast("Reaksiyon kaldırılamadı: " + error.message, "error");
        return;
      }

      setMessageReactions((prev) =>
        prev.filter((reaction) => reaction.id !== myCurrentReaction.id)
      );
      setOpenReactionMessageId(null);

      return;
    }

    if (myCurrentReaction) {
      const { error: deleteError } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", myCurrentReaction.id);

      if (deleteError) {
        showToast("Eski reaksiyon kaldırılamadı: " + deleteError.message, "error");
        return;
      }

      setMessageReactions((prev) =>
        prev.filter((reaction) => reaction.id !== myCurrentReaction.id)
      );
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
        setOpenReactionMessageId(null);
        return;
      }

      showToast("Reaksiyon eklenemedi: " + error.message, "error");
      return;
    }

    if (data) {
      setMessageReactions((prev) => {
        const withoutMyOldReaction = prev.filter(
          (reaction) =>
            !(
              reaction.message_id === messageId &&
              reaction.user_id === currentUserId
            )
        );

        return [...withoutMyOldReaction, data];
      });
    }

    setOpenReactionMessageId(null);
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

        {openReactionMessageId === messageId && (
          <div className="absolute left-0 top-9 z-40 rounded-2xl border border-white/10 bg-[#1f2026] p-2 shadow-2xl animate-[fadeIn_0.12s_ease-out]">
            <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Reaksiyon seç
            </div>

            <div className="flex items-center gap-1">
              {reactionEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(messageId, emoji)}
                  className="h-9 w-9 rounded-xl text-lg transition-all duration-200 hover:bg-indigo-600/25 hover:scale-125 active:scale-95"
                  title={`${emoji} ekle`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function getProfileForMessage(msg: Message) {
    if (msg.user_id) return profiles.find((p) => p.id === msg.user_id) || null;
    return profiles.find((p) => p.username === msg.username) || null;
  }

  function getMessageById(messageId: number | null) {
    if (!messageId) return null;
    return messages.find((message) => message.id === messageId) || null;
  }

  function getShortContent(text: string) {
    if (isOnlyImageMessage(text)) return "📷 Resim";
    return text.length > 80 ? text.slice(0, 80) + "..." : text;
  }

  function startReply(msg: Message) {
    setReplyToMessage(msg);

    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[placeholder*="kanalına mesaj gönder"]'
      );
      input?.focus();
    }, 50);
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
      .select("id, username, avatar_url, banner_url, role, about, status, profile_color, created_at, last_seen, manual_status")
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
    setCurrentAbout(profile?.about || "");
    setCurrentStatus(profile?.status || "online");
    setCurrentProfileColor(profile?.profile_color || "#6366f1");
    setCurrentLastSeen(profile?.last_seen || null);
    setCurrentManualStatus(profile?.manual_status || profile?.status || "online");

    await supabase
      .from("profiles")
      .update({
        last_seen: new Date().toISOString(),
        manual_status: profile?.manual_status || profile?.status || "online",
      })
      .eq("id", data.user.id);

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

  function getFriendRelation(profileId: string) {
    return friends.find(
      (friend) =>
        (friend.sender_id === currentUserId && friend.receiver_id === profileId) ||
        (friend.receiver_id === currentUserId && friend.sender_id === profileId)
    );
  }

  function getFriendButtonState(profileId: string) {
    const relation = getFriendRelation(profileId);

    if (!relation) return "none";
    if (relation.status === "accepted") return "accepted";

    if (relation.status === "pending" && relation.sender_id === currentUserId) {
      return "outgoing";
    }

    if (relation.status === "pending" && relation.receiver_id === currentUserId) {
      return "incoming";
    }

    return "none";
  }

  async function getFriends() {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("friends")
      .select("id, sender_id, receiver_id, status, created_at")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Arkadaşlar alınamadı: " + error.message, "error");
      return;
    }

    setFriends(data || []);
  }

  async function searchUsersForFriend() {
    const query = friendSearch.trim();

    if (query.length < 2) {
      showToast("En az 2 karakter yaz.", "error");
      return;
    }

    setFriendSearchLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, avatar_url, banner_url, role, about, status, profile_color, created_at, last_seen, manual_status"
      )
      .ilike("username", `%${query}%`)
      .neq("id", currentUserId)
      .limit(8);

    setFriendSearchLoading(false);

    if (error) {
      showToast("Kullanıcı aranamadı: " + error.message, "error");
      return;
    }

    setFriendSearchResults(data || []);
  }

  async function sendFriendRequest(profileId: string) {
    if (!currentUserId || profileId === currentUserId) return;

    const existing = getFriendRelation(profileId);

    if (existing) {
      showToast("Bu kullanıcıyla zaten arkadaşlık durumun var.", "info");
      return;
    }

    const { error } = await supabase.from("friends").insert({
      sender_id: currentUserId,
      receiver_id: profileId,
      status: "pending",
    });

    if (error) {
      showToast("Arkadaşlık isteği gönderilemedi: " + error.message, "error");
      return;
    }

    showToast("Arkadaşlık isteği gönderildi.", "success");
    await getFriends();
  }

  async function acceptFriendRequest(friendId: string) {
    const { error } = await supabase
      .from("friends")
      .update({ status: "accepted" })
      .eq("id", friendId);

    if (error) {
      showToast("İstek kabul edilemedi: " + error.message, "error");
      return;
    }

    showToast("Arkadaşlık isteği kabul edildi.", "success");
    await getFriends();
  }

  async function rejectFriendRequest(friendId: string) {
    const { error } = await supabase.from("friends").delete().eq("id", friendId);

    if (error) {
      showToast("İstek silinemedi: " + error.message, "error");
      return;
    }

    showToast("İstek kaldırıldı.", "success");
    await getFriends();
  }

  async function removeFriend(friendId: string) {
    openConfirm({
      title: "Arkadaşlıktan çıkarılsın mı?",
      description: "Bu kişi arkadaş listenden kaldırılacak.",
      confirmText: "Kaldır",
      danger: true,
      onConfirm: async () => {
        const { error } = await supabase.from("friends").delete().eq("id", friendId);

        if (error) {
          showToast("Arkadaş kaldırılamadı: " + error.message, "error");
          return;
        }

        showToast("Arkadaş kaldırıldı.", "success");
        await getFriends();
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
      .select("id, username, avatar_url, banner_url, role, about, status, profile_color, created_at, last_seen, manual_status");

    if (data) {
      setProfiles(data);

      const myProfile = data.find((profile) => profile.id === currentUserId);

      if (myProfile) {
        setUsername(myProfile.username || username);
        setAvatarUrl(myProfile.avatar_url || null);
        setCurrentRole(myProfile.role || "user");
        setCurrentAbout(myProfile.about || "");
        setCurrentStatus(myProfile.status || "online");
        setCurrentProfileColor(myProfile.profile_color || "#6366f1");
        setCurrentLastSeen(myProfile.last_seen || null);
        setCurrentManualStatus(myProfile.manual_status || myProfile.status || "online");
      }

      setSelectedProfile((prev) => {
        if (!prev) return prev;

        return data.find((profile) => profile.id === prev.id) || prev;
      });
    }
  }

  async function getMessages() {
    if (!activeServerId || !activeChannelId) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select(
        "id, username, content, created_at, edited_at, user_id, channel_id, server_id, channel_uuid, reply_to_id, pinned, pinned_at"
      )
      .eq("server_id", activeServerId)
      .eq("channel_uuid", activeChannelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
      await getReactions(data.map((message) => message.id));
      scrollToBottom("auto");
      setTimeout(() => scrollToBottom("auto"), 400);
      setTimeout(() => scrollToBottom("auto"), 1200);
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
      reply_to_id: replyToMessage?.id || null,
    });

    if (messageError) {
      showToast("Resim mesaja eklenemedi: " + messageError.message, "error");
      return;
    }

    showToast("Resim gönderildi.", "success");
    setReplyToMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setTimeout(() => {
      getMessages();
    }, 250);
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
    setOpenReactionMessageId(null);
    if (!content.trim()) return;
    if (!activeServerId || !activeChannelId) return;

    const { error } = await supabase.from("messages").insert({
      username,
      user_id: currentUserId,
      server_id: activeServerId,
      channel_uuid: activeChannelId,
      channel_id: activeChannelName,
      content,
      reply_to_id: replyToMessage?.id || null,
    });

    if (error) {
      showToast("Mesaj gönderilemedi: " + error.message, "error");
      return;
    }

    setContent("");
    setReplyToMessage(null);

    setTimeout(() => {
      getMessages();
    }, 250);
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

  async function togglePinMessage(msg: Message) {
    const canPin = msg.user_id === currentUserId || currentRole === "admin";

    if (!canPin) {
      showToast("Bu mesajı sabitleme yetkin yok.", "error");
      return;
    }

    const nextPinned = !msg.pinned;

    const { error } = await supabase
      .from("messages")
      .update({
        pinned: nextPinned,
        pinned_at: nextPinned ? new Date().toISOString() : null,
      })
      .eq("id", msg.id);

    if (error) {
      showToast("Mesaj sabitlenemedi: " + error.message, "error");
      return;
    }

    setMessages((prev) =>
      prev.map((message) =>
        message.id === msg.id
          ? {
              ...message,
              pinned: nextPinned,
              pinned_at: nextPinned ? new Date().toISOString() : null,
            }
          : message
      )
    );

    showToast(
      nextPinned ? "Mesaj sabitlendi." : "Mesaj sabitten kaldırıldı.",
      "success"
    );
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
    if (!currentUserId) return;

    let cancelled = false;

    async function touchLastSeen() {
      if (cancelled) return;

      const now = new Date().toISOString();
      setCurrentLastSeen(now);

      await supabase
        .from("profiles")
        .update({ last_seen: now })
        .eq("id", currentUserId);
    }

    touchLastSeen();

    const interval = setInterval(touchLastSeen, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        touchLastSeen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUserId]);

  useEffect(() => {
    function openFriendsFromSidebar() {
      setAppView("friends");
      setFriendsPanelOpen(false);
      setPinnedPanelOpen(false);
    }

    window.addEventListener("zencolive-open-friends", openFriendsFromSidebar);

    return () => {
      window.removeEventListener("zencolive-open-friends", openFriendsFromSidebar);
    };
  }, []);

  useEffect(() => {
    if (currentUserId) getServers();
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) getFriends();
  }, [currentUserId]);

  useEffect(() => {
    if (activeServerId) {
      getChannels(activeServerId);
      setEditingId(null);
      setContent("");
      setReplyToMessage(null);
      setOpenReactionMessageId(null);
      setPinnedPanelOpen(false);
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
      .channel(`messages-channel-${activeServerId}-${activeChannelId}`)
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

              setMessages((prev) => {
                const alreadyExists = prev.some((msg) => msg.id === newMessage.id);

                if (alreadyExists) return prev;

                return [...prev, newMessage];
              });

              if (shouldScroll) {
                scrollToBottom("smooth");
                setTimeout(() => scrollToBottom("smooth"), 250);
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
    if (!currentUserId) return;

    const friendsChannel = supabase
      .channel(`friends-live-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends" },
        async () => {
          await getFriends();
          await getProfiles();
        }
      )
      .subscribe();

    const fallbackInterval = setInterval(() => {
      getFriends();
    }, 4000);

    return () => {
      supabase.removeChannel(friendsChannel);
      clearInterval(fallbackInterval);
    };
  }, [currentUserId]);

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

      if (isNearBottomRef.current) {
        setTimeout(() => scrollToBottom("auto"), 500);
        setTimeout(() => scrollToBottom("auto"), 1400);
      }
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
            setAppView("server");
            setFriendsPanelOpen(false);
            setActiveServerId(serverId);
            setActiveChannelId("");
            setEditingId(null);
            setContent("");
          }}
          onCreateServer={() => setServerActionOpen(true)}
          onOpenSettings={() => router.push("/settings")}
          onOpenFriends={() => {
            setAppView("friends");
            setFriendsPanelOpen(false);
            setPinnedPanelOpen(false);
          }}
          friendsActive={appView === "friends"}
        />

        {appView === "server" ? (
        <ChannelSidebar
  activeServer={activeServer}
  textChannels={textChannels}
  voiceChannels={voiceChannels}
  activeChannelId={activeChannelId}
  username={username}
  avatarUrl={avatarUrl}
  currentRole={currentRole}
  currentStatus={currentDisplayStatus}
  currentManualStatus={currentManualStatus}
  currentAbout={currentAbout}
  currentProfileColor={currentProfileColor}
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
    setReplyToMessage(null);
    setOpenReactionMessageId(null);
    setPinnedPanelOpen(false);
    setFriendsPanelOpen(false);
    setUnreadCount(0);
    isNearBottomRef.current = true;
  }}
  onLogout={logout}
/>
        ) : (
          <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col border-r border-black/30 shadow-xl">
            <div className="rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-[#232428] via-[#202127] to-[#17181c] p-4 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/25 text-2xl shadow-lg shadow-indigo-900/20">
                  👥
                </span>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-white">
                    Arkadaşlar
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    DM ve sosyal alan
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  setFriendsTab("online");
                  setSelectedDmProfileId(null);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  friendsTab === "online" && !selectedDmProfileId
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "bg-[#36383f] hover:bg-[#44464f] text-gray-200"
                }`}
              >
                <span>🟢</span>
                <span className="font-black">Çevrimiçi</span>
              </button>

              <button
                onClick={() => {
                  setFriendsTab("all");
                  setSelectedDmProfileId(null);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  friendsTab === "all" && !selectedDmProfileId
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "bg-[#36383f] hover:bg-[#44464f] text-gray-200"
                }`}
              >
                <span>👥</span>
                <span className="font-black">Tüm Arkadaşlar</span>
              </button>

              <button
                onClick={() => {
                  setFriendsTab("pending");
                  setSelectedDmProfileId(null);
                }}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                  friendsTab === "pending" && !selectedDmProfileId
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "bg-[#36383f] hover:bg-[#44464f] text-gray-200"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span>⏳</span>
                  <span className="font-black">Bekleyen</span>
                </span>

                {incomingFriendRequests.length + outgoingFriendRequests.length > 0 && (
                  <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-black text-white">
                    {incomingFriendRequests.length + outgoingFriendRequests.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setFriendsTab("add");
                  setSelectedDmProfileId(null);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  friendsTab === "add" && !selectedDmProfileId
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "bg-[#36383f] hover:bg-[#44464f] text-gray-200"
                }`}
              >
                <span>➕</span>
                <span className="font-black">Arkadaş Ekle</span>
              </button>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 px-2 text-xs font-black text-gray-400">
                DİREKT MESAJLAR
              </p>

              {friendProfiles.length === 0 ? (
                <p className="rounded-2xl bg-[#232428] p-3 text-xs text-gray-500">
                  Henüz DM gösterecek arkadaşın yok.
                </p>
              ) : (
                <div className="zenco-scroll max-h-[320px] space-y-1 overflow-y-auto pr-1">
                  {friendProfiles.map(({ profile }) => {
                    if (!profile) return null;

                    const statusInfo = getProfileStatusInfo(profile);

                    return (
                      <button
                        key={profile.id}
                        onClick={() => {
                          setSelectedDmProfileId(profile.id);
                          setFriendsTab("all");
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                          selectedDmProfileId === profile.id
                            ? "bg-indigo-600 text-white"
                            : "hover:bg-[#36383f] text-gray-200"
                        }`}
                      >
                        <Avatar
                          username={profile.username}
                          avatarUrl={profile.avatar_url}
                          size="sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">
                            {profile.username}
                          </p>
                          <p className={`truncate text-[11px] font-bold ${statusInfo.textClass}`}>
                            {statusInfo.icon} {statusInfo.label}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        <section className="relative flex-1 flex flex-col h-screen">
          {appView === "friends" ? (
            <div className="flex h-full flex-col bg-[#313338]">
              <header className="h-14 border-b border-[#1e1f22] bg-[#313338]/95 px-6 flex items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600/20 text-lg">
                    👥
                  </span>

                  <div>
                    <h2 className="text-base font-black">Arkadaşlar</h2>
                    <p className="text-xs text-gray-400">
                      Arkadaşlarını yönet ve DM başlat
                    </p>
                  </div>
                </div>
              </header>

              <div className="zenco-scroll flex-1 overflow-y-auto p-6">
                {selectedDmProfileId ? (
                  (() => {
                    const dmProfile = profiles.find(
                      (profile) => profile.id === selectedDmProfileId
                    );

                    if (!dmProfile) return null;

                    const statusInfo = getProfileStatusInfo(dmProfile);

                    return (
                      <div className="mx-auto flex h-full max-w-5xl flex-col rounded-[32px] border border-indigo-400/20 bg-[#1f2026] shadow-2xl shadow-black/30 overflow-hidden">
                        <div
                          className="h-32 bg-cover bg-center"
                          style={
                            dmProfile.banner_url
                              ? {
                                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.1), rgba(0,0,0,.75)), url(${dmProfile.banner_url})`,
                                }
                              : {
                                  background: `linear-gradient(135deg, ${getSafeProfileColor(
                                    dmProfile.profile_color
                                  )}, #111214)`,
                                }
                          }
                        />

                        <div className="border-b border-white/10 p-5">
                          <div className="-mt-14 flex items-end gap-4">
                            <Avatar
                              username={dmProfile.username}
                              avatarUrl={dmProfile.avatar_url}
                              size="lg"
                            />

                            <div className="pb-1">
                              <h3 className="text-2xl font-black">
                                {dmProfile.username}
                              </h3>
                              <p className={`text-sm font-bold ${statusInfo.textClass}`}>
                                {statusInfo.icon} {statusInfo.label}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 rounded-2xl bg-[#232428] p-4">
                            <p className="mb-1 text-xs font-black text-gray-400">
                              HAKKIMDA
                            </p>
                            <p className="text-sm text-gray-300">
                              {dmProfile.about?.trim() || "Henüz hakkında bilgisi yok."}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-1 items-center justify-center p-8 text-center">
                          <div>
                            <p className="text-5xl mb-4">💬</p>
                            <h3 className="text-xl font-black">
                              DM sohbeti bir sonraki adımda açılacak
                            </h3>
                            <p className="mt-2 max-w-md text-sm text-gray-400">
                              Altyapı hazır. Sonraki adımda bu alana gerçek özel mesajlaşmayı bağlayacağız.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="mx-auto max-w-6xl">
                    <div className="mb-6 rounded-[32px] border border-indigo-400/20 bg-gradient-to-br from-[#232428] to-[#1b1c20] p-6 shadow-2xl shadow-black/30">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h1 className="text-3xl font-black">Arkadaşlar</h1>
                          <p className="mt-1 text-sm text-gray-400">
                            Çevrimiçi arkadaşlarını gör, istekleri yönet ve DM başlat.
                          </p>
                        </div>

                        <button
                          onClick={() => setFriendsTab("add")}
                          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-700 transition hover:scale-[1.02]"
                        >
                          + Arkadaş Ekle
                        </button>
                      </div>
                    </div>

                    {friendsTab === "add" && (
                      <div className="rounded-[28px] border border-white/10 bg-[#232428] p-5 shadow-xl">
                        <p className="mb-3 text-xs font-black text-gray-400">
                          ARKADAŞ EKLE
                        </p>

                        <div className="flex gap-2">
                          <input
                            value={friendSearch}
                            onChange={(e) => setFriendSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") searchUsersForFriend();
                            }}
                            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#383a40] px-4 py-3 text-sm outline-none focus:border-indigo-500"
                            placeholder="Kullanıcı adı ara..."
                          />

                          <button
                            onClick={searchUsersForFriend}
                            disabled={friendSearchLoading}
                            className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {friendSearchLoading ? "Aranıyor..." : "Ara"}
                          </button>
                        </div>

                        {friendSearchResults.length > 0 && (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {friendSearchResults.map((profile) => {
                              const relationState = getFriendButtonState(profile.id);
                              const statusInfo = getProfileStatusInfo(profile);

                              return (
                                <div
                                  key={profile.id}
                                  className="flex items-center gap-3 rounded-2xl bg-[#1f2026] p-3"
                                >
                                  <Avatar
                                    username={profile.username}
                                    avatarUrl={profile.avatar_url}
                                    size="sm"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black">
                                      {profile.username}
                                    </p>
                                    <p className={`text-xs font-bold ${statusInfo.textClass}`}>
                                      {statusInfo.icon} {statusInfo.label}
                                    </p>
                                  </div>

                                  {relationState === "none" && (
                                    <button
                                      onClick={() => sendFriendRequest(profile.id)}
                                      className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black hover:bg-indigo-700"
                                    >
                                      Ekle
                                    </button>
                                  )}

                                  {relationState === "outgoing" && (
                                    <span className="rounded-xl bg-yellow-500/15 px-3 py-2 text-xs font-black text-yellow-200">
                                      Bekliyor
                                    </span>
                                  )}

                                  {relationState === "incoming" && (
                                    <span className="rounded-xl bg-green-500/15 px-3 py-2 text-xs font-black text-green-200">
                                      İstek var
                                    </span>
                                  )}

                                  {relationState === "accepted" && (
                                    <span className="rounded-xl bg-green-500/15 px-3 py-2 text-xs font-black text-green-200">
                                      Arkadaş
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {friendsTab === "pending" && (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[28px] border border-white/10 bg-[#232428] p-5 shadow-xl">
                          <p className="mb-3 text-xs font-black text-gray-400">
                            GELEN İSTEKLER
                          </p>

                          {incomingFriendRequests.length === 0 ? (
                            <p className="rounded-2xl bg-[#1f2026] p-4 text-sm text-gray-400">
                              Gelen arkadaşlık isteği yok.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {incomingFriendRequests.map((request) => {
                                const profile = profiles.find(
                                  (item) => item.id === request.sender_id
                                );

                                if (!profile) return null;

                                return (
                                  <div
                                    key={request.id}
                                    className="flex items-center gap-3 rounded-2xl bg-[#1f2026] p-3"
                                  >
                                    <Avatar
                                      username={profile.username}
                                      avatarUrl={profile.avatar_url}
                                      size="sm"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-black">
                                        {profile.username}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        Arkadaşlık isteği gönderdi
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => acceptFriendRequest(request.id)}
                                      className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black hover:bg-green-700"
                                    >
                                      Kabul
                                    </button>

                                    <button
                                      onClick={() => rejectFriendRequest(request.id)}
                                      className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black hover:bg-red-700"
                                    >
                                      Reddet
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-[#232428] p-5 shadow-xl">
                          <p className="mb-3 text-xs font-black text-gray-400">
                            GÖNDERİLEN İSTEKLER
                          </p>

                          {outgoingFriendRequests.length === 0 ? (
                            <p className="rounded-2xl bg-[#1f2026] p-4 text-sm text-gray-400">
                              Bekleyen gönderilmiş isteğin yok.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {outgoingFriendRequests.map((request) => {
                                const profile = profiles.find(
                                  (item) => item.id === request.receiver_id
                                );

                                if (!profile) return null;

                                return (
                                  <div
                                    key={request.id}
                                    className="flex items-center gap-3 rounded-2xl bg-[#1f2026] p-3"
                                  >
                                    <Avatar
                                      username={profile.username}
                                      avatarUrl={profile.avatar_url}
                                      size="sm"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-black">
                                        {profile.username}
                                      </p>
                                      <p className="text-xs text-yellow-300">
                                        İstek bekliyor
                                      </p>
                                    </div>

                                    <button
                                      onClick={() => rejectFriendRequest(request.id)}
                                      className="rounded-xl bg-[#383a40] px-3 py-2 text-xs font-black hover:bg-red-600 transition"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(friendsTab === "all" || friendsTab === "online") && (
                      <div className="rounded-[28px] border border-white/10 bg-[#232428] p-5 shadow-xl">
                        <p className="mb-3 text-xs font-black text-gray-400">
                          {friendsTab === "online"
                            ? "ÇEVRİMİÇİ ARKADAŞLAR"
                            : "TÜM ARKADAŞLAR"}
                        </p>

                        {friendProfiles.filter(({ profile }) =>
                          friendsTab === "online" ? isProfileOnline(profile) : true
                        ).length === 0 ? (
                          <p className="rounded-2xl bg-[#1f2026] p-4 text-sm text-gray-400">
                            Gösterilecek arkadaş yok.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {friendProfiles
                              .filter(({ profile }) =>
                                friendsTab === "online" ? isProfileOnline(profile) : true
                              )
                              .map(({ friend, profile }) => {
                                if (!profile) return null;

                                const statusInfo = getProfileStatusInfo(profile);

                                return (
                                  <div
                                    key={friend.id}
                                    className="flex items-center gap-3 rounded-2xl bg-[#1f2026] p-3 hover:bg-[#2b2d31] transition"
                                  >
                                    <button onClick={() => setSelectedProfile(profile)}>
                                      <Avatar
                                        username={profile.username}
                                        avatarUrl={profile.avatar_url}
                                        size="sm"
                                      />
                                    </button>

                                    <button
                                      onClick={() => setSelectedProfile(profile)}
                                      className="min-w-0 flex-1 text-left"
                                    >
                                      <p className="truncate text-sm font-black">
                                        {profile.username}
                                      </p>
                                      <p className={`text-xs font-bold ${statusInfo.textClass}`}>
                                        {statusInfo.icon} {statusInfo.label}
                                      </p>
                                    </button>

                                    <button
                                      onClick={() => setSelectedDmProfileId(profile.id)}
                                      className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black hover:bg-indigo-700 transition"
                                    >
                                      DM
                                    </button>

                                    <button
                                      onClick={() => removeFriend(friend.id)}
                                      className="rounded-xl bg-[#383a40] px-3 py-2 text-xs font-black hover:bg-red-600 transition"
                                    >
                                      Kaldır
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
          <header className="h-14 bg-[#313338]/95 backdrop-blur border-b border-[#1e1f22] flex items-center px-6 shadow-sm">
            <h2 className="font-bold"># {activeChannelName}</h2>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setPinnedPanelOpen((prev) => !prev)}
                className={`group flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-black transition-all duration-200 hover:scale-[1.03] active:scale-95 ${
                  pinnedPanelOpen
                    ? "border-yellow-300/60 bg-gradient-to-r from-yellow-500/30 to-amber-500/15 text-yellow-50 shadow-lg shadow-yellow-900/20"
                    : pinnedMessages.length > 0
                    ? "border-yellow-400/35 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-100 shadow-md shadow-yellow-900/10 hover:border-yellow-300/60 hover:from-yellow-500/30"
                    : "border-white/10 bg-[#404249] text-gray-300 hover:bg-[#50535a]"
                }`}
                title="Sabitlenen mesajlar"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-yellow-500/20 transition group-hover:rotate-[-12deg]">
                  📌
                </span>

                <span>Sabitler</span>

                {pinnedMessages.length > 0 && (
                  <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] text-yellow-50">
                    {pinnedMessages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentServerNotification(!soundEnabled)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  soundEnabled
                    ? "bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30"
                    : "bg-[#404249] text-gray-300 hover:bg-[#50535a]"
                }`}
                title="Bu sunucunun bildirim sesi"
              >
                {soundEnabled ? "🔔 Bu Sunucuda Açık" : "🔕 Bu Sunucuda Kapalı"}
              </button>
            </div>
          </header>

          {pinnedPanelOpen && (
            <div className="absolute left-4 right-4 top-16 z-50 rounded-3xl border border-yellow-400/20 bg-[#1f2026]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl animate-[fadeIn_0.15s_ease-out]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-500/15 text-xl shadow-lg shadow-yellow-900/10">
                    📌
                  </span>

                  <div>
                    <p className="text-base font-black text-yellow-100">
                      Sabitlenen mesajlar
                    </p>
                    <p className="text-xs text-gray-400">
                      Bu kanalda önemli görülen mesajlar
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPinnedPanelOpen(false)}
                  className="h-9 w-9 rounded-full bg-[#383a40] hover:bg-red-600 font-black transition hover:scale-105"
                  title="Kapat"
                >
                  ✕
                </button>
              </div>

              {pinnedMessages.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#232428] px-4 py-5 text-sm text-gray-400">
                  Bu kanalda henüz sabitlenen mesaj yok.
                </div>
              ) : (
                <div className="zenco-scroll max-h-72 space-y-2 overflow-y-auto pr-1">
                  {pinnedMessages.map((pinnedMessage) => (
                    <button
                      key={pinnedMessage.id}
                      onClick={() => {
                        setPinnedPanelOpen(false);
                        setTimeout(() => {
                          const element = document.getElementById(
                            `message-${pinnedMessage.id}`
                          );

                          element?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }, 100);
                      }}
                      className="w-full rounded-2xl border border-yellow-400/15 bg-gradient-to-r from-yellow-500/15 via-[#232428] to-[#232428] px-4 py-3 text-left shadow-lg shadow-black/10 hover:border-yellow-300/50 hover:translate-x-1 transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/15 text-yellow-100">
                          📌
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-yellow-100">
                            {pinnedMessage.username}
                            <span className="ml-2 font-normal text-gray-500">
                              {new Date(pinnedMessage.created_at).toLocaleString("tr-TR")}
                            </span>
                          </p>
                          <p className="mt-1 truncate text-sm text-gray-200">
                            {getShortContent(pinnedMessage.content)}
                          </p>
                        </div>

                        <span className="mt-2 text-xs text-gray-500">Git →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                  id={`message-${msg.id}`}
                  key={msg.id}
                  className="group relative flex gap-4 rounded-xl px-3 py-1.5 transition-all duration-200 hover:bg-[#2b2d31] scroll-mt-20"
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

                      <div className="absolute right-4 -top-4 z-30 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#1f2026] p-1 shadow-xl">
                          <button
                            onClick={() => startReply(msg)}
                            className="h-8 w-8 rounded-lg hover:bg-[#3a3c43] transition hover:scale-110"
                            title="Cevapla"
                          >
                            💬
                          </button>

                          <button
                            onClick={() =>
                              setOpenReactionMessageId((prev) =>
                                prev === msg.id ? null : msg.id
                              )
                            }
                            className="h-8 w-8 rounded-lg hover:bg-[#3a3c43] transition hover:scale-110"
                            title="Reaksiyon ekle"
                          >
                            😊
                          </button>

                          <button
                            onClick={() => togglePinMessage(msg)}
                            className={`h-8 w-8 rounded-lg transition hover:scale-110 ${
                              msg.pinned
                                ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                                : "hover:bg-[#3a3c43]"
                            }`}
                            title={msg.pinned ? "Sabitten kaldır" : "Mesajı sabitle"}
                          >
                            📌
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => startEdit(msg)}
                              className="h-8 w-8 rounded-lg hover:bg-[#3a3c43] transition hover:scale-110"
                              title="Düzenle"
                            >
                              ✏️
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => deleteMessage(msg)}
                              className="h-8 w-8 rounded-lg hover:bg-red-600/80 transition hover:scale-110"
                              title="Sil"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
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
                        {msg.pinned && (
                          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-gradient-to-r from-yellow-500/20 to-amber-500/10 px-3 py-1.5 text-xs font-black text-yellow-100 shadow-lg shadow-yellow-900/10">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20">
                              📌
                            </span>
                            <span>Sabitlenen mesaj</span>
                          </div>
                        )}

                        {msg.reply_to_id && getMessageById(msg.reply_to_id) && (
                          <button
                            onClick={() => {
                              const repliedElement = document.getElementById(
                                `message-${msg.reply_to_id}`
                              );

                              repliedElement?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                            }}
                            className="mb-2 flex max-w-lg items-center gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-600/15 to-[#232428]/95 px-3 py-2 text-left shadow-lg shadow-black/10 hover:border-indigo-400/60 hover:bg-[#2b2d31] transition-all duration-200 hover:translate-x-1"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600/25 text-indigo-200">
                              ↩
                            </span>

                            <div className="min-w-0">
                              <p className="text-xs font-black text-indigo-200">
                                {getProfileForMessage(getMessageById(msg.reply_to_id)!)?.username ||
                                  getMessageById(msg.reply_to_id)?.username ||
                                  "Kullanıcı"} kişisine yanıt
                              </p>
                              <p className="mt-0.5 truncate text-xs text-gray-300">
                                {getShortContent(getMessageById(msg.reply_to_id)?.content || "")}
                              </p>
                            </div>
                          </button>
                        )}

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
            {replyToMessage && (
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/15 to-[#232428] px-4 py-3 shadow-lg shadow-black/10">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/25 text-indigo-200">
                    ↩
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-black text-indigo-200">
                      {replyToMessage.username} kullanıcısına yanıt veriyorsun
                    </p>
                    <p className="truncate text-sm text-gray-300">
                      {getShortContent(replyToMessage.content)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setReplyToMessage(null)}
                  className="ml-3 h-9 w-9 rounded-full bg-[#383a40] hover:bg-red-600 font-black transition hover:scale-105"
                  title="Cevabı iptal et"
                >
                  ✕
                </button>
              </div>
            )}

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
            </>
          )}
        </section>

        {selectedProfile && (
          <div
            onClick={() => setSelectedProfile(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#2b2d31] rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-[fadeIn_0.15s_ease-out]"
            >
              <div
                className="relative h-36 bg-cover bg-center"
                style={
                  selectedProfile.banner_url
                    ? {
                        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.05), rgba(0,0,0,.55)), url(${selectedProfile.banner_url})`,
                      }
                    : {
                        background: `linear-gradient(135deg, ${getSafeProfileColor(
                          selectedProfile.profile_color
                        )}, #111214)`,
                      }
                }
              >
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="absolute right-4 top-4 h-9 w-9 rounded-full bg-black/35 hover:bg-red-600 font-black backdrop-blur transition"
                  title="Kapat"
                >
                  ✕
                </button>
              </div>

              <div className="p-5">
                <div className="-mt-16 mb-4 flex items-end justify-between">
                  <div className="relative">
                    {selectedProfile.avatar_url ? (
                      <img
                        src={selectedProfile.avatar_url}
                        alt={selectedProfile.username}
                        className="h-24 w-24 rounded-full object-cover border-8 border-[#2b2d31] bg-indigo-600 shadow-2xl"
                      />
                    ) : (
                      <div
                        className="h-24 w-24 rounded-full border-8 border-[#2b2d31] flex items-center justify-center text-4xl font-black shadow-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${getSafeProfileColor(
                            selectedProfile.profile_color
                          )}, #8b5cf6)`,
                        }}
                      >
                        {selectedProfile.username[0]?.toUpperCase() || "Z"}
                      </div>
                    )}

                    <span
                      className={`absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-[#2b2d31] ${
                        getProfileStatusInfo(selectedProfile).dotClass
                      }`}
                    />
                  </div>

                  {selectedProfile.role === "admin" && (
                    <span className="mb-2 rounded-full bg-green-500/15 px-3 py-1 text-xs font-black text-green-300">
                      Admin
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black">
                  {selectedProfile.username}
                </h2>

                <p
                  className={`mt-1 text-sm font-bold ${
                    getProfileStatusInfo(selectedProfile).textClass
                  }`}
                >
                  {getProfileStatusInfo(selectedProfile).icon}{" "}
                  {getProfileStatusInfo(selectedProfile).label}
                </p>

                {selectedProfile.id !== currentUserId && (
                  <div className="mt-4">
                    {getFriendButtonState(selectedProfile.id) === "none" && (
                      <button
                        onClick={() => sendFriendRequest(selectedProfile.id)}
                        className="w-full rounded-2xl bg-indigo-600 py-3 font-black hover:bg-indigo-700 transition"
                      >
                        + Arkadaş Ekle
                      </button>
                    )}

                    {getFriendButtonState(selectedProfile.id) === "outgoing" && (
                      <button
                        disabled
                        className="w-full rounded-2xl bg-yellow-500/15 py-3 font-black text-yellow-200"
                      >
                        ⏳ İstek Gönderildi
                      </button>
                    )}

                    {getFriendButtonState(selectedProfile.id) === "incoming" && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            const relation = getFriendRelation(selectedProfile.id);
                            if (relation) acceptFriendRequest(relation.id);
                          }}
                          className="rounded-2xl bg-green-600 py-3 font-black hover:bg-green-700 transition"
                        >
                          Kabul Et
                        </button>

                        <button
                          onClick={() => {
                            const relation = getFriendRelation(selectedProfile.id);
                            if (relation) rejectFriendRequest(relation.id);
                          }}
                          className="rounded-2xl bg-red-600 py-3 font-black hover:bg-red-700 transition"
                        >
                          Reddet
                        </button>
                      </div>
                    )}

                    {getFriendButtonState(selectedProfile.id) === "accepted" && (
                      <button
                        onClick={() => {
                          const relation = getFriendRelation(selectedProfile.id);
                          if (relation) removeFriend(relation.id);
                        }}
                        className="w-full rounded-2xl bg-green-500/15 py-3 font-black text-green-200 hover:bg-red-600 hover:text-white transition"
                      >
                        ✅ Arkadaşsınız
                      </button>
                    )}
                  </div>
                )}



                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-[#232428] p-4">
                    <p className="mb-1 text-xs font-black text-gray-400">
                      HAKKIMDA
                    </p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {selectedProfile.about?.trim() ||
                        "Henüz hakkında bilgisi yok."}
                    </p>
                  </div>

                  
                  <div className="rounded-2xl bg-[#232428] p-4">
                    <p className="mb-1 text-xs font-black text-gray-400">
                      KATILMA TARİHİ
                    </p>
                    <p className="text-sm text-gray-300">
                      {formatJoinDate(selectedProfile.created_at)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedProfile(null)}
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 rounded-2xl py-3 font-black transition-all duration-200 hover:scale-[1.02]"
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