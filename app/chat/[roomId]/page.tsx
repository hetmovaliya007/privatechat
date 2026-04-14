"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import {
  Hash, Lock, Users, Paperclip, Smile, Send,
  X, Reply, Edit2, Trash2,
  Shield, ChevronDown, UserPlus, ChevronUp, Copy, Search, Pin
} from "lucide-react";
import toast from "react-hot-toast";
import type { Message, Room, User, Reaction } from "@/types";
import InviteMemberModal from "@/components/chat/InviteMemberModal";

const TYPING_TIMEOUT = 2500;

export default function ChatRoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinned, setShowPinned] = useState(false);
  const oldestMsgRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Current user
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (profile) setCurrentUser(profile as User);

      // Room info
      const { data: roomData } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (roomData) setRoom(roomData as Room);

      // Members
      const { data: memberData } = await supabase
        .from("room_members")
        .select("user_id, role, profiles(id, username, email, status, avatar_url)")
        .eq("room_id", roomId);
      if (memberData) {
        const users = memberData.map((m: { profiles: unknown }) => m.profiles).filter(Boolean) as User[];
        setMembers(users);
        const roles: Record<string, string> = {};
        memberData.forEach((m: { user_id: string; role: string }) => { roles[m.user_id] = m.role; });
        setMemberRoles(roles);
      }

      // Messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, sender:profiles(id, username, email, status, avatar_url)")
        .eq("room_id", roomId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (msgs) {
        const ordered = msgs.reverse();
        const decrypted = ordered.map((m: Message) => ({
          ...m,
          content: m.type === "text" ? decryptMessage(m.content) : m.content,
        }));
        setMessages(decrypted);
        setHasMore(msgs.length === 50);
        if (ordered.length > 0) oldestMsgRef.current = ordered[0].created_at;
        setPinnedMessages(decrypted.filter(m => m.is_pinned));
      }

      // Reactions
      const { data: rxns } = await supabase
        .from("reactions")
        .select("*")
        .in("message_id", msgs?.map((m: Message) => m.id) ?? []);
      if (rxns) setReactions(rxns as Reaction[]);

      setLoading(false);
      setTimeout(() => scrollToBottom(false), 100);
    };
    init();
  }, [roomId, scrollToBottom]);

  const loadOlderMessages = async () => {
    if (!oldestMsgRef.current || loadingMore) return;
    setLoadingMore(true);
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, sender:profiles(id, username, email, status, avatar_url)")
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .lt("created_at", oldestMsgRef.current)
      .order("created_at", { ascending: false })
      .limit(50);
    if (msgs && msgs.length > 0) {
      const ordered = msgs.reverse();
      const decrypted = ordered.map((m: Message) => ({
        ...m,
        content: m.type === "text" ? decryptMessage(m.content) : m.content,
      }));
      setMessages(prev => [...decrypted, ...prev]);
      setHasMore(msgs.length === 50);
      oldestMsgRef.current = ordered[0].created_at;
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    const existing = reactions.find(r => r.message_id === msgId && r.user_id === currentUser.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data } = await supabase.from("reactions").insert({ message_id: msgId, user_id: currentUser.id, emoji }).select().single();
      if (data) setReactions(prev => [...prev, data as Reaction]);
    }
    setShowEmojiPicker(null);
  };

  // Real-time subscriptions
  useEffect(() => {
    // Messages channel
    const msgChannel = supabase
      .channel(`room-messages-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;

        // Use cached members instead of extra DB call
        const sender = members.find(m => m.id === newMsg.sender_id) || currentUser || null;

        // reply_message from existing messages cache
        let reply_message: Message | undefined;
        if (newMsg.reply_to) {
          reply_message = messages.find(m => m.id === newMsg.reply_to);
        }

        const fullMsg: Message = {
          ...newMsg,
          content: newMsg.type === "text" ? decryptMessage(newMsg.content) : newMsg.content,
          sender: sender as User,
          reply_message,
        };
        setMessages(prev => {
          if (prev.find(m => m.id === fullMsg.id)) return prev;
          return [...prev, fullMsg];
        });
        // Browser notification
        if (fullMsg.sender_id !== currentUser?.id) {
          sendBrowserNotification(fullMsg.sender?.username || "Someone", fullMsg.type === "text" ? fullMsg.content : `[${fullMsg.type}]`);
        }
        scrollToBottom();
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m =>
          m.id === updated.id
            ? { ...m, content: updated.type === "text" ? decryptMessage(updated.content) : updated.content, is_edited: updated.is_edited, is_deleted: updated.is_deleted }
            : m
        ).filter(m => !m.is_deleted));
      })
      .subscribe();

    // Typing channel
    const typingChannel = supabase.channel(`typing-${roomId}`);
    typingChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== currentUser?.id) {
          setTypingUsers(prev => {
            if (!prev.includes(payload.username)) return [...prev, payload.username];
            return prev;
          });
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== payload.username));
          }, TYPING_TIMEOUT);
        }
      })
      .subscribe();

    // Reactions channel
    const rxnChannel = supabase
      .channel(`reactions-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reactions" }, (payload) => {
        setReactions(prev => [...prev, payload.new as Reaction]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reactions" }, (payload) => {
        setReactions(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(rxnChannel);
    };
  }, [roomId, currentUser?.id, scrollToBottom]);

  const sendTyping = useCallback(async () => {
    if (!currentUser) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    await supabase.channel(`typing-${roomId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUser.id, username: currentUser.username },
    });
  }, [currentUser, roomId]);

  const sendMessage = async () => {
    if ((!input.trim() && !editingMsg) || sending || !currentUser) return;
    setSending(true);

    if (editingMsg) {
      const encrypted = encryptMessage(input.trim());
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: input.trim(), is_edited: true } : m));
      setEditingMsg(null);
      setInput("");
      setSending(false);
      await supabase.from("messages").update({ content: encrypted, is_edited: true }).eq("id", editingMsg.id);
      return;
    }

    // Optimistic UI — show instantly
    const tempId = `temp-${Date.now()}`;
    const reply_message = replyTo ? messages.find(m => m.id === replyTo.id) : undefined;
    const optimisticMsg: Message = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUser.id,
      content: input.trim(),
      type: "text",
      reply_to: replyTo?.id,
      reply_message,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender: currentUser,
      optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();
    const msgText = input.trim();
    setInput("");
    setReplyTo(null);
    setSending(false);

    try {
      const encrypted = encryptMessage(msgText);
      const { data: inserted } = await supabase.from("messages").insert({
        room_id: roomId,
        sender_id: currentUser.id,
        content: encrypted,
        type: "text",
        reply_to: replyTo?.id || null,
        is_edited: false,
        is_deleted: false,
      }).select().single();
      // Replace optimistic with real
      if (inserted) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...inserted, content: msgText, sender: currentUser, reply_message } : m));
      }
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("Failed to send message");
    }
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("messages").update({ is_deleted: true, content: "" }).eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    toast.success("Message deleted");
  };

  const pinMessage = async (msg: Message) => {
    const newPinned = !msg.is_pinned;
    await supabase.from("messages").update({ is_pinned: newPinned }).eq("id", msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_pinned: newPinned } : m));
    setPinnedMessages(prev => newPinned ? [...prev, { ...msg, is_pinned: true }] : prev.filter(p => p.id !== msg.id));
    toast.success(newPinned ? "Message pinned!" : "Message unpinned");
  };

  const sendBrowserNotification = useCallback((senderName: string, content: string) => {
    if (Notification.permission === "granted" && document.hidden) {
      new Notification(`${senderName} — VoidChat`, { body: content, icon: "/favicon.ico" });
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File must be under 5MB");

    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${roomId}/${currentUser.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("chat-files").getPublicUrl(path);
      const isImage = file.type.startsWith("image/");

      await supabase.from("messages").insert({
        room_id: roomId,
        sender_id: currentUser.id,
        content: file.name,
        type: isImage ? "image" : "file",
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        is_edited: false,
        is_deleted: false,
      });
      toast.success("File sent!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleScroll = () => {
    if (!messagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) {
        const h = date.getHours().toString().padStart(2, "0");
        const m = date.getMinutes().toString().padStart(2, "0");
        return `${h}:${m}`;
      }
      if (days < 7) {
        const days_arr = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const h = date.getHours().toString().padStart(2, "0");
        const m = date.getMinutes().toString().padStart(2, "0");
        return `${days_arr[date.getDay()]} ${h}:${m}`;
      }
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const isOwn = (msg: Message) => msg.sender_id === currentUser?.id;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-void">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-text-dim text-xs font-mono">loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container flex flex-col bg-void overflow-hidden">
      {/* Chat Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
            {room?.type === "direct" ? (
              <Lock size={14} className="text-accent" />
            ) : (
              <Hash size={14} className="text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-text text-sm truncate">{room?.name}</h2>
            <div className="hidden sm:flex items-center gap-1.5">
              <Shield size={9} className="text-accent" />
              <span className="text-[10px] text-accent font-mono">end-to-end encrypted</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {room?.type === "group" && (
            <>
              <button
                onClick={async () => {
                  const { data } = await supabase.from("rooms").select("invite_code").eq("id", roomId).single();
                  if (data?.invite_code) {
                    navigator.clipboard.writeText(data.invite_code);
                    toast.success(`Invite code copied: ${data.invite_code}`);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-dim hover:text-accent hover:bg-accent/10 transition-all"
              >
                <Copy size={13} />
                <span className="hidden sm:inline">Invite</span>
              </button>
              <button onClick={() => setShowInvite(true)} className="p-1.5 rounded-lg text-text-dim hover:text-accent hover:bg-accent/10 transition-all">
                <UserPlus size={14} />
              </button>
            </>
          )}
          <button onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg text-xs transition-all ${showSearch ? "bg-accent/15 text-accent" : "text-text-dim hover:text-text hover:bg-panel"}`}>
            <Search size={14} />
          </button>
          {pinnedMessages.length > 0 && (
            <button onClick={() => setShowPinned(!showPinned)}
              className={`p-1.5 rounded-lg text-xs transition-all ${showPinned ? "bg-accent/15 text-accent" : "text-text-dim hover:text-text hover:bg-panel"}`}>
              <Pin size={14} />
            </button>
          )}
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${showMembers ? "bg-accent/15 text-accent" : "text-text-dim hover:text-text hover:bg-panel"}`}
          >
            <Users size={13} />
            <span>{members.length}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Search bar */}
          {showSearch && (
            <div className="px-4 py-2 border-b border-border bg-surface">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Messages search karo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-void border border-border rounded-lg pl-8 pr-3 py-2 text-text text-xs placeholder:text-muted focus:border-accent/40 transition-colors"
                />
              </div>
              {searchQuery && (
                <p className="text-text-dim text-[10px] mt-1">
                  {messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length} results
                </p>
              )}
            </div>
          )}

          {/* Pinned messages */}
          {showPinned && pinnedMessages.length > 0 && (
            <div className="px-4 py-2 border-b border-border bg-accent/5">
              <p className="text-accent text-[10px] font-mono uppercase mb-2">📌 Pinned Messages</p>
              <div className="space-y-1">
                {pinnedMessages.map(pm => (
                  <div key={pm.id} className="flex items-center gap-2 text-xs text-text-dim">
                    <span className="text-accent/70 font-medium">{pm.sender?.username}:</span>
                    <span className="truncate">{pm.type === "text" ? pm.content : `[${pm.type}]`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div
            ref={messagesRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
          >
            {/* Load older messages */}
            {hasMore && (
              <div className="flex justify-center py-2">
                <button
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-dim hover:text-text hover:bg-panel transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />
                  ) : (
                    <ChevronUp size={12} />
                  )}
                  Load older messages
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  {room?.type === "direct" ? <Lock size={22} className="text-accent" /> : <Hash size={22} className="text-accent" />}
                </div>
                <div>
                  <p className="text-text font-semibold text-sm">Start of {room?.type === "direct" ? "your private chat" : `#${room?.name}`}</p>
                  <p className="text-text-dim text-xs mt-1">All messages are encrypted.</p>
                </div>
              </div>
            )}

            {messages.filter(m =>
              !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((msg, idx, arr) => {
              const own = isOwn(msg);
              const prevMsg = arr[idx - 1];
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              return (
                <div key={msg.id} className={`group flex gap-2.5 message-enter ${own ? "flex-row-reverse" : ""} ${!showAvatar ? (own ? "mr-10" : "ml-10") : ""}`}>
                  {/* Avatar */}
                  {showAvatar && (
                    <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-accent text-xs font-bold">
                        {(msg.sender?.username || "?")[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[70%] ${own ? "items-end" : "items-start"}`}>
                    {/* Sender name + time */}
                    {showAvatar && (
                      <div className={`flex items-center gap-2 mb-1 ${own ? "flex-row-reverse" : ""}`}>
                        <span className="text-text text-xs font-semibold">
                          {own ? "You" : msg.sender?.username}
                        </span>
                        <span className="text-text-dim text-[10px] font-mono">{formatTime(msg.created_at)}</span>
                        {msg.is_edited && <span className="text-text-dim text-[10px]">(edited)</span>}
                      </div>
                    )}

                    {/* Reply preview */}
                    {msg.reply_to && msg.reply_message && (
                      <div className={`text-[10px] text-text-dim border-l-2 border-accent/40 pl-2 mb-1 max-w-[200px] truncate ${own ? "text-right border-r-2 border-l-0 pr-2 pl-0" : ""}`}>
                        <span className="text-accent/70">{msg.reply_message.sender?.username}: </span>
                        {msg.reply_message.type === "text" ? msg.reply_message.content : `[${msg.reply_message.type}]`}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={`relative rounded-2xl px-3.5 py-2.5 text-sm ${own ? "message-bubble-own rounded-tr-sm" : "message-bubble-other rounded-tl-sm"}`}>
                      {msg.type === "text" && (
                        <p className="text-text leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      {msg.type === "image" && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={msg.file_url} alt={msg.file_name || "image"} className="max-w-xs rounded-xl max-h-60 object-cover" />
                        </a>
                      )}
                      {msg.type === "file" && (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-accent hover:underline">
                          <Paperclip size={13} />
                          <span className="text-xs">{msg.file_name}</span>
                          {msg.file_size && (
                            <span className="text-text-dim text-[10px]">
                              ({(msg.file_size / 1024).toFixed(1)}KB)
                            </span>
                          )}
                        </a>
                      )}
                    </div>

                    {/* Reactions display */}
                    {(() => {
                      const msgReactions = reactions.filter(r => r.message_id === msg.id);
                      const grouped = msgReactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.keys(grouped).length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(grouped).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-all ${
                                reactions.some(r => r.message_id === msg.id && r.user_id === currentUser?.id && r.emoji === emoji)
                                  ? "bg-accent/20 border-accent/40 text-accent"
                                  : "bg-panel border-border text-text-dim hover:border-accent/30"
                              }`}
                            >
                              {emoji} {count}
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Hover actions - mobile pe always visible */}
                    <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch:opacity-100 transition-opacity ${own ? "flex-row-reverse" : ""}`}>
                      <button onClick={() => setReplyTo(msg)}
                        className="p-1 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-all">
                        <Reply size={11} />
                      </button>
                      <button onClick={() => pinMessage(msg)}
                        className={`p-1 rounded-lg transition-all ${msg.is_pinned ? "text-accent" : "text-text-dim hover:text-text hover:bg-panel"}`}>
                        <Pin size={11} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                          className="p-1 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-all"
                        >
                          <Smile size={11} />
                        </button>
                        {showEmojiPicker === msg.id && (
                          <div className={`absolute bottom-7 ${own ? "right-0" : "left-0"} bg-panel border border-border rounded-xl p-2 flex gap-1.5 z-10 shadow-lg`}>
                            {["👍","❤️","😂","😮","😢","🔥"].map(emoji => (
                              <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                className="text-base hover:scale-125 transition-transform">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {own && (
                        <>
                          <button onClick={() => { setEditingMsg(msg); setInput(msg.content); }}
                            className="p-1 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-all">
                            <Edit2 size={11} />
                          </button>
                          <button onClick={() => deleteMessage(msg.id)}
                            className="p-1 rounded-lg text-text-dim hover:text-accent-2 hover:bg-accent-2/10 transition-all">
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 pl-2">
                <div className="flex gap-1 bg-panel border border-border rounded-full px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-dim typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-text-dim typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-text-dim typing-dot" />
                </div>
                <span className="text-text-dim text-xs">{typingUsers.join(", ")} typing...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button onClick={() => scrollToBottom()}
              className="absolute bottom-24 right-5 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg animate-fade-in glow-accent">
              <ChevronDown size={16} />
            </button>
          )}

          {/* Input area */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            {/* Reply bar */}
            {replyTo && (
              <div className="flex items-center justify-between bg-panel border border-border rounded-xl px-3 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <Reply size={12} className="text-accent" />
                  <span className="text-xs text-text-dim">
                    Replying to <span className="text-text font-medium">{replyTo.sender?.username}</span>
                  </span>
                  <span className="text-xs text-text-dim truncate max-w-[200px]">{replyTo.content}</span>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-text-dim hover:text-text">
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Edit bar */}
            {editingMsg && (
              <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-xl px-3 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <Edit2 size={12} className="text-accent" />
                  <span className="text-xs text-accent">Editing message</span>
                </div>
                <button onClick={() => { setEditingMsg(null); setInput(""); }} className="text-text-dim hover:text-text">
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 bg-panel border border-border rounded-2xl px-3 py-2 focus-within:border-accent/40 transition-colors">
              {/* File upload */}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="text-text-dim hover:text-accent transition-colors shrink-0 mb-1 disabled:opacity-50"
                title="Attach file"
              >
                {uploadingFile ? (
                  <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}
              </button>

              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); sendTyping(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`Message ${room?.type === "direct" ? room?.name : `#${room?.name}`}...`}
                rows={1}
                style={{ resize: "none", minHeight: "24px", maxHeight: "120px" }}
                className="flex-1 bg-transparent text-text text-sm placeholder:text-muted leading-6 overflow-y-auto"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />

              <button
                onClick={sendMessage}
                disabled={(!input.trim() && !editingMsg) || sending}
                className="w-8 h-8 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-30 text-white flex items-center justify-center shrink-0 transition-all glow-accent"
              >
                {sending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-muted mt-1.5 font-mono">
              🔐 Messages are end-to-end encrypted
            </p>
          </div>
        </div>

        {/* Members panel */}
        {showMembers && (
          <aside className="w-48 sm:w-56 border-l border-border bg-surface shrink-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider">Members · {members.length}</h3>
            </div>
            <div className="p-2 space-y-0.5">
              {/* Admins first, then members */}
              {[...members].sort((a, b) => {
                const aRole = memberRoles[a.id] || "member";
                const bRole = memberRoles[b.id] || "member";
                if (aRole === "admin" && bRole !== "admin") return -1;
                if (aRole !== "admin" && bRole === "admin") return 1;
                return 0;
              }).map(member => {
                const role = memberRoles[member.id] || "member";
                const isAdmin = role === "admin";
                return (
                  <div key={member.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-panel transition-colors">
                    <div className="relative">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isAdmin ? "bg-accent/30" : "bg-accent/20"}`}>
                        <span className="text-accent text-xs font-bold">{member.username[0].toUpperCase()}</span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface status-${member.status}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-text text-xs font-medium truncate">{member.username}</p>
                        {isAdmin && (
                          <span className="shrink-0 text-[9px] font-bold text-accent bg-accent/15 px-1 py-0.5 rounded">ADMIN</span>
                        )}
                      </div>
                      <p className="text-text-dim text-[10px] truncate">{member.email}</p>
                      <p className="text-text-dim text-[10px] capitalize">{member.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {showInvite && (
        <InviteMemberModal
          roomId={roomId}
          currentUserId={currentUser?.id || ""}
          onClose={() => setShowInvite(false)}
          onInvited={() => {
            setShowInvite(false);
            supabase
              .from("room_members")
              .select("user_id, role, profiles(id, username, email, status, avatar_url)")
              .eq("room_id", roomId)
              .then(({ data }) => {
                if (data) {
                  setMembers(data.map((m: { profiles: unknown }) => m.profiles).filter(Boolean) as User[]);
                  const roles: Record<string, string> = {};
                  data.forEach((m: { user_id: string; role: string }) => { roles[m.user_id] = m.role; });
                  setMemberRoles(roles);
                }
              });
          }}
        />
      )}
    </div>
  );
}
