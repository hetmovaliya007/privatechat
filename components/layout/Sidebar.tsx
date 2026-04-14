"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare, Plus, Search, LogOut, Settings,
  Hash, Lock, User as UserIcon, Shield, X, DoorOpen
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User, Room } from "@/types";
import toast from "react-hot-toast";
import CreateRoomModal from "@/components/chat/CreateRoomModal";

interface SidebarProps {
  user: User | null;
  rooms: Room[];
  onRoomsUpdate: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, rooms, onRoomsUpdate, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState<string | null>(null);

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await supabase.from("profiles").update({ status: "offline" }).eq("id", user?.id || "");
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/");
  };

  const leaveRoom = async (roomId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Leave this room?")) return;
    setLeavingRoom(roomId);
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", user?.id || "");
    toast.success("Left room");
    if (pathname === `/chat/${roomId}`) router.push("/chat");
    onRoomsUpdate();
    setLeavingRoom(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-72 flex flex-col bg-surface border-r border-border shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:pt-0 pt-12
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center glow-accent">
              <MessageSquare size={14} className="text-white" />
            </div>
            <span className="font-bold text-base text-text">VoidChat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-accent text-xs font-mono bg-accent/10 px-2 py-0.5 rounded-full">
              <Shield size={10} />
              E2E
            </div>
            <button onClick={onClose} className="md:hidden p-1 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-panel border border-border rounded-lg pl-8 pr-3 py-2 text-text text-xs placeholder:text-muted focus:border-accent/40 transition-colors"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-text-dim text-xs font-mono uppercase tracking-wider">Channels</span>
            <button onClick={() => setShowCreate(true)}
              className="w-5 h-5 flex items-center justify-center rounded text-text-dim hover:text-accent hover:bg-accent/10 transition-colors">
              <Plus size={13} />
            </button>
          </div>

          <div className="space-y-0.5">
            {filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-dim text-xs">No rooms yet.</p>
                <button onClick={() => setShowCreate(true)}
                  className="text-accent text-xs hover:underline mt-1">Create one</button>
              </div>
            ) : (
              filtered.map((room) => {
                const active = pathname === `/chat/${room.id}`;
                const unread = room.unread_count ?? 0;
                return (
                  <Link key={room.id} href={`/chat/${room.id}`}
                    onClick={() => { onClose?.(); }}
                    className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
                      active
                        ? "bg-accent/15 border border-accent/20 text-text"
                        : "hover:bg-panel text-text-dim hover:text-text"
                    }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-accent/20" : "bg-border group-hover:bg-muted/30"
                    }`}>
                      {room.type === "direct" ? (
                        <Lock size={12} className={active ? "text-accent" : "text-text-dim"} />
                      ) : (
                        <Hash size={12} className={active ? "text-accent" : "text-text-dim"} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium truncate">{room.name}</p>
                        {unread > 0 && !active && (
                          <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                      {room.last_message && (
                        <p className="text-[10px] text-text-dim truncate">
                          {room.last_message.sender?.username}: {
                            room.last_message.type === "text"
                              ? room.last_message.content
                              : `[${room.last_message.type}]`
                          }
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => leaveRoom(room.id, e)}
                      disabled={leavingRoom === room.id}
                      className="hidden group-hover:flex p-1 rounded text-text-dim hover:text-accent-2 hover:bg-accent-2/10 transition-all shrink-0"
                      title="Leave room"
                    >
                      <DoorOpen size={11} />
                    </button>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <UserIcon size={14} className="text-accent" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface status-${user?.status || "offline"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text text-xs font-medium truncate">{user?.username}</p>
              <p className="text-text-dim text-[10px] truncate">{user?.email}</p>
            </div>
            <div className="flex gap-1">
              <Link href="/chat/settings"
                className="p-1.5 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-colors">
                <Settings size={13} />
              </Link>
              <button onClick={handleLogout}
                className="p-1.5 rounded-lg text-text-dim hover:text-accent-2 hover:bg-accent-2/10 transition-colors">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {showCreate && (
        <CreateRoomModal
          userId={user?.id || ""}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); onRoomsUpdate(); }}
        />
      )}
    </>
  );
}
