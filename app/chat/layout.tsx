"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/Sidebar";
import type { User, Room } from "@/types";
import { Menu, Settings } from "lucide-react";
import Link from "next/link";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchRooms = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("room_members")
      .select(`room_id, rooms(id, name, description, type, created_by, avatar_url, created_at)`)
      .eq("user_id", userId);

    if (!data) return;
    const roomList = data.map((d: { rooms: unknown }) => d.rooms).filter(Boolean) as Room[];
    if (roomList.length === 0) { setRooms([]); return; }

    // Single query for all last messages (no N+1)
    const roomIds = roomList.map(r => r.id);
    const { data: allMsgs } = await supabase
      .from("messages")
      .select("id, content, type, sender_id, room_id, created_at, sender:profiles(id, username)")
      .in("room_id", roomIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // Pick last message per room
    const lastMsgMap: Record<string, typeof allMsgs extends (infer T)[] | null ? T : never> = {};
    allMsgs?.forEach((msg) => {
      if (!lastMsgMap[msg.room_id]) lastMsgMap[msg.room_id] = msg;
    });

    const enriched = roomList.map(room => ({
      ...room,
      last_message: lastMsgMap[room.id] ?? undefined,
      unread_count: 0,
    } as Room));

    enriched.sort((a, b) => {
      const aTime = a.last_message?.created_at ?? a.created_at;
      const bTime = b.last_message?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setRooms(enriched);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUser(profile as User);
        await fetchRooms(session.user.id);
        await supabase.from("profiles").update({ status: "online" }).eq("id", session.user.id);
      }
      setLoading(false);
    };
    init();

    const handleUnload = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("profiles").update({ status: "offline" }).eq("id", session.user.id);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [router, fetchRooms]);

  // Realtime: sidebar rooms update when new message arrives
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("sidebar-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchRooms(user.id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_members", filter: `user_id=eq.${user.id}` }, () => {
        fetchRooms(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRooms]);

  if (loading) {
    return (
      <div className="h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-text-dim text-sm font-mono">connecting to void...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container flex bg-void overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-colors"
        >
          <Menu size={18} />
        </button>
        <span className="font-bold text-sm text-text flex-1">VoidChat</span>
        <Link href="/chat/settings" className="p-2 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-colors">
          <Settings size={18} />
        </Link>
      </div>

      <Sidebar
        user={user}
        rooms={rooms}
        onRoomsUpdate={() => user && fetchRooms(user.id)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 md:pt-0 pt-12">{children}</main>
    </div>
  );
}
