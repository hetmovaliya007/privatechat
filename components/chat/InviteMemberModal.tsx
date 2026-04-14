"use client";
import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

interface Props {
  roomId: string;
  currentUserId: string;
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteMemberModal({ roomId, currentUserId, onClose, onInvited }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const invite = async () => {
    if (!email.trim()) return toast.error("Enter an email");
    setLoading(true);
    try {
      const { data: target } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("email", email.trim())
        .single();

      if (!target) throw new Error("User not found");
      if (target.id === currentUserId) throw new Error("That's you!");

      const { error } = await supabase
        .from("room_members")
        .insert({ room_id: roomId, user_id: target.id, role: "member" });

      if (error?.code === "23505") throw new Error("Already a member");
      if (error) throw error;

      toast.success(`${target.username} added!`);
      onInvited();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-text">Invite Member</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-dim mb-1.5 block">User Email</label>
            <input
              type="email"
              placeholder="friend@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
              className="w-full bg-void border border-border rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
            />
          </div>
          <button onClick={invite} disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><UserPlus size={14} /> Add to Room</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
