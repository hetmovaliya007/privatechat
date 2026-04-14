"use client";
import { useState } from "react";
import { X, Hash, Lock, Users, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateRoomModal({ userId, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<"group" | "join" | "direct">("group");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const createGroup = async () => {
    if (!name.trim()) return toast.error("Room name required");
    if (!/^[a-zA-Z0-9_]+$/.test(name.trim())) return toast.error("Sirf letters, numbers aur _ allowed hain");
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

  const joinGroup = async () => {
    if (!inviteCode.trim()) return toast.error("Invite code daalo");
    setLoading(true);
    try {
      // Find room by invite code
      const { data: room, error } = await supabase
        .from("rooms")
        .select("id, name, type")
        .eq("invite_code", inviteCode.trim().toLowerCase())
        .eq("type", "group")
        .single();

      if (error || !room) throw new Error("Invalid invite code — room nahi mila");

      // Check already member
      const { data: existing } = await supabase
        .from("room_members")
        .select("id")
        .eq("room_id", room.id)
        .eq("user_id", userId)
        .single();

      if (existing) {
        toast("Tum already is room mein ho!");
        onCreated();
        return;
      }

      // Join room
      const { error: joinError } = await supabase
        .from("room_members")
        .insert({ room_id: room.id, user_id: userId, role: "member" });

      if (joinError) throw joinError;
      toast.success(`#${room.name} mein join ho gaye!`);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Join failed");
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
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === "group" ? "bg-accent text-white" : "text-text-dim hover:text-text"
            }`}>
            <Hash size={11} /> Create
          </button>
          <button onClick={() => setTab("join")}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === "join" ? "bg-accent text-white" : "text-text-dim hover:text-text"
            }`}>
            <LogIn size={11} /> Join
          </button>
          <button onClick={() => setTab("direct")}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === "direct" ? "bg-accent text-white" : "text-text-dim hover:text-text"
            }`}>
            <Lock size={11} /> DM
          </button>
        </div>

        {/* Create Group */}
        {tab === "group" && (
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
        )}

        {/* Join Group */}
        {tab === "join" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs text-accent">Dost se invite code maango aur yahan daalo group join karne ke liye.</p>
            </div>
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Invite Code</label>
              <div className="relative">
                <LogIn size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  type="text"
                  placeholder="e.g. ab12cd34"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())}
                  maxLength={8}
                  className="w-full bg-void border border-border rounded-xl pl-8 pr-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors font-mono tracking-widest"
                />
              </div>
            </div>
            <button onClick={joinGroup} disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                <><LogIn size={14} /> Join Group</>
              )}
            </button>
          </div>
        )}

        {/* Direct Message */}
        {tab === "direct" && (
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
