"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { encryptMessage, decryptMessage } from "@/lib/encryption";
import { formatDistanceToNow } from "date-fns";
import {
  Hash, Lock, Users, Paperclip, Smile, Send,
  X, Reply, Edit2, Trash2, MoreHorizontal,
  Shield, ChevronDown, Image as ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";
import type { Message, Room, User } from "@/types";

const TYPING_TIMEOUT = 2500;

export default function ChatRoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
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
        .select("user_id, profiles(id, username, email, status, avatar_url)")
        .eq("room_id", roomId);
      if (memberData) {
        const users = memberData.map((m: { profiles: unknown }) => m.profiles).filter(Boolean) as User[];
        setMembers(users);
      }

      // Messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*, sender:profiles(id, username, email, status, avatar_url)")
        .eq("room_id", roomId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(100);

      if (msgs) {
        const decrypted = msgs.map((m: Message) => ({
          ...m,
          content: m.type === "text" ? decryptMessage(m.content) : m.content,
        }));
        setMessages(decrypted);
      }

      setLoading(false);
      setTimeout(() => scrollToBottom(false), 100);
    };
    init();
  }, [roomId, scrollToBottom]);

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
        // Fetch sender info
        const { data: sender } = await supabase.from("profiles").select("*").eq("id", newMsg.sender_id).single();
        const fullMsg: Message = {
          ...newMsg,
          content: newMsg.type === "text" ? decryptMessage(newMsg.content) : newMsg.content,
          sender: sender as User,
        };
        setMessages(prev => {
          if (prev.find(m => m.id === fullMsg.id)) return prev;
          return [...prev, fullMsg];
        });
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

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
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

    try {
      if (editingMsg) {
        // Edit existing message
        const encrypted = encryptMessage(input.trim());
        await supabase.from("messages").update({ content: encrypted, is_edited: true }).eq("id", editingMsg.id);
        setEditingMsg(null);
        setInput("");
      } else {
        // New message
        const encrypted = encryptMessage(input.trim());
        await supabase.from("messages").insert({
          room_id: roomId,
          sender_id: currentUser.id,
          content: encrypted,
          type: "text",
          reply_to: replyTo?.id || null,
          is_edited: false,
          is_deleted: false,
        });
        setInput("");
        setReplyTo(null);
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("messages").update({ is_deleted: true, content: "" }).eq("id", msgId);
    setActiveMenu(null);
    toast.success("Message deleted");
  };

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
      return formatDistanceToNow(new Date(ts), { addSuffix: true });
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
    <div className="flex-1 flex flex-col h-screen bg-void overflow-hidden">
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
          <div
            ref={messagesRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
          >
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

            {messages.map((msg, idx) => {
              const own = isOwn(msg);
              const prevMsg = messages[idx - 1];
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
                    {msg.reply_to && (
                      <div className={`text-[10px] text-text-dim border-l-2 border-accent/40 pl-2 mb-1 ${own ? "text-right border-r-2 border-l-0 pr-2 pl-0" : ""}`}>
                        Replying to a message
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

                    {/* Hover actions */}
                    <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${own ? "flex-row-reverse" : ""}`}>
                      <button onClick={() => setReplyTo(msg)}
                        className="p-1 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-all">
                        <Reply size={11} />
                      </button>
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
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-panel transition-colors">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-xs font-bold">{member.username[0].toUpperCase()}</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface status-${member.status}`} />
                  </div>
                  <div>
                    <p className="text-text text-xs font-medium">{member.username}</p>
                    <p className="text-text-dim text-[10px] capitalize">{member.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
