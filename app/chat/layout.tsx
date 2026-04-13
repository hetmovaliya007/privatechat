"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/layout/Sidebar";
import type { User, Room } from "@/types";
import { Menu } from "lucide-react";

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

    if (data) {
      const roomList = data
        .map((d: { rooms: unknown }) => d.rooms)
        .filter(Boolean) as Room[];
      setRooms(roomList);
    }
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
    <div className="h-screen flex bg-void overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-text-dim hover:text-text hover:bg-panel transition-colors"
        >
          <Menu size={18} />
        </button>
        <span className="font-bold text-sm text-text">VoidChat</span>
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
