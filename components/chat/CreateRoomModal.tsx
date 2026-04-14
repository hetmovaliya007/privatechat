"use client";
import { useState } from "react";
import { X, Hash, Lock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateRoomModal({ userId, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<"group" | "direct">("group");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const createGroup = async () => {
    if (!name.trim()) return toast.error("Room name required");
    if (!/^[a-zA-Z0-9_]+$/.test(name.trim())) return toast.error("Room name mein sirf letters, numbers aur _ allowed hain");
    if (name.trim().length < 3) return toast.error("Room name 3+ characters hona chahiye");
    setLoading(true);
    try {
      const { data: room, error } = await supabase
        .from("rooms")
        .insert({ name: name.trim(), description: description.trim(), type: "group", created_by: userId })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("room_members").insert({ room_id: room.id, user_id: userId, role: "admin" });
      toast.success(`#${name} created!`);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const createDM = async () => {
    if (!targetEmail.trim()) return toast.error("Enter an email");
    setLoading(true);
    try {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("email", targetEmail.trim())
        .single();

      if (!target) throw new Error("User not found");
      if (target.id === userId) throw new Error("Can't DM yourself");

      // Create DM room
      const dmName = `dm-${[userId, target.id].sort().join("-")}`;
      const { data: existing } = await supabase
        .from("rooms")
        .select("id")
        .eq("name", dmName)
        .eq("type", "direct")
        .single();

      if (existing) {
        toast("DM already exists!");
        onCreated();
        return;
      }

      const { data: room, error } = await supabase
        .from("rooms")
        .insert({ name: target.username, description: dmName, type: "direct", created_by: userId })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("room_members").insert([
        { room_id: room.id, user_id: userId, role: "member" },
        { room_id: room.id, user_id: target.id, role: "member" },
      ]);

      toast.success(`DM with ${target.username} created!`);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create DM");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-text">New Conversation</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-void rounded-xl mb-5">
          <button onClick={() => setTab("group")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === "group" ? "bg-accent text-white" : "text-text-dim hover:text-text"
            }`}>
            <Hash size={12} /> Group Room
          </button>
          <button onClick={() => setTab("direct")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === "direct" ? "bg-accent text-white" : "text-text-dim hover:text-text"
            }`}>
            <Lock size={12} /> Direct Message
          </button>
        </div>

        {tab === "group" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Room Name</label>
              <div className="relative">
                <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  type="text"
                  placeholder="general (letters, numbers, _)"
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  className="w-full bg-void border border-border rounded-xl pl-8 pr-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Description (optional)</label>
              <input
                type="text"
                placeholder="What's this room about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-void border border-border rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
              />
            </div>
            <button onClick={createGroup} disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                <><Users size={14} /> Create Group</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">User Email</label>
              <input
                type="email"
                placeholder="friend@email.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-void border border-border rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
              />
            </div>
            <button onClick={createDM} disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                <><Lock size={14} /> Start DM</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
