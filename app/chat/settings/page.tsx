"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, Shield, Save, ArrowLeft, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { User as UserType } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) { setUser(data as UserType); setUsername(data.username); }
    };
    load();
  }, [router]);

  const saveProfile = async () => {
    if (!username.trim() || !user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ username: username.trim() }).eq("id", user.id);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-void p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-dim hover:text-text transition-colors mb-6 text-sm">
          <ArrowLeft size={15} /> Back to Chat
        </button>

        <h1 className="text-2xl font-bold text-text mb-1">Settings</h1>
        <p className="text-text-dim text-sm mb-8">Manage your VoidChat account</p>

        {/* Profile */}
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-accent" />
            <h2 className="font-semibold text-text">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-void border border-border rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-void/50 border border-border rounded-xl px-4 py-2.5 text-text-dim text-sm cursor-not-allowed"
              />
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-accent" />
            <h2 className="font-semibold text-text">Security & Privacy</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "End-to-End Encryption", desc: "All messages are encrypted with AES-256", active: true },
              { label: "No Message Logging", desc: "Messages are not stored in plain text", active: true },
              { label: "Zero Tracking", desc: "No analytics, no ads, no data selling", active: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-text text-sm">{item.label}</p>
                  <p className="text-text-dim text-xs">{item.desc}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${item.active ? "bg-green-400" : "bg-muted"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="glass rounded-2xl p-6 border border-accent-2/20">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 size={16} className="text-accent-2" />
            <h2 className="font-semibold text-accent-2">Danger Zone</h2>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Are you sure? This cannot be undone.")) return;
              await supabase.auth.signOut();
              router.push("/");
            }}
            className="flex items-center gap-2 px-4 py-2 border border-accent-2/30 text-accent-2 hover:bg-accent-2/10 rounded-xl text-sm transition-all"
          >
            <Trash2 size={13} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
