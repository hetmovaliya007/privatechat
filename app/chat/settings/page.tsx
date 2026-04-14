"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, Shield, Save, ArrowLeft, Camera, Bell } from "lucide-react";
import toast from "react-hot-toast";
import type { User as UserType } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (data) {
        setUser(data as UserType);
        setUsername(data.username);
        setBio(data.bio || "");
      }
    };
    load();
    setNotifEnabled(Notification.permission === "granted");
  }, [router]);

  const saveProfile = async () => {
    if (!username.trim() || !user) return;
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return toast.error("Username mein sirf letters, numbers aur _ allowed hain");
    setSaving(true);
    try {
      await supabase.from("profiles").update({ username: username.trim(), bio: bio.trim() }).eq("id", user.id);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Sirf image allowed hai");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image 2MB se chhoti honi chahiye");
    setUploadingAvatar(true);
    try {
      const path = `avatars/${user.id}.${file.name.split(".").pop()}`;
      await supabase.storage.from("chat-files").upload(path, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("chat-files").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setUser({ ...user, avatar_url: publicUrl });
      toast.success("Avatar updated!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const enableNotifications = async () => {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifEnabled(true);
      toast.success("Notifications enabled!");
    } else {
      toast.error("Notifications blocked — browser settings se allow karo");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-void">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border glass">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-dim hover:text-text transition-colors text-sm">
          <ArrowLeft size={15} /> Back
        </button>
        <span className="font-semibold text-text text-sm">Settings</span>
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-accent" />
          <span className="text-[10px] text-accent font-mono">encrypted</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
      <div className="max-w-lg mx-auto">

        {/* Avatar + Profile */}
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-accent" />
            <h2 className="font-semibold text-text">Profile</h2>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center overflow-hidden">
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-accent text-2xl font-bold">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-all"
              >
                {uploadingAvatar
                  ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  : <Camera size={11} />
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </div>
            <div>
              <p className="text-text font-medium text-sm">{user?.username}</p>
              <p className="text-text-dim text-xs">{user?.email}</p>
              <p className="text-text-dim text-xs mt-0.5 capitalize">{user?.status}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                className="w-full bg-void border border-border rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-dim mb-1.5 block">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Apne baare mein kuch likho..."
                maxLength={100}
                rows={2}
                className="w-full bg-void border border-border rounded-xl px-4 py-2.5 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors resize-none"
              />
              <p className="text-text-dim text-[10px] text-right mt-0.5">{bio.length}/100</p>
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

        {/* Notifications */}
        <div className="glass rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-accent" />
            <h2 className="font-semibold text-text">Notifications</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text text-sm">Browser Notifications</p>
              <p className="text-text-dim text-xs">Naye messages pe notification aayega</p>
            </div>
            {notifEnabled ? (
              <span className="text-xs text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded-full">Enabled ✓</span>
            ) : (
              <button onClick={enableNotifications}
                className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-all">
                Enable
              </button>
            )}
          </div>
        </div>

        {/* Security */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-accent" />
            <h2 className="font-semibold text-text">Security & Privacy</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "End-to-End Encryption", desc: "AES-256 encryption on every message" },
              { label: "No Message Logging", desc: "Messages not stored in plain text" },
              { label: "Zero Tracking", desc: "No analytics, no ads, no data selling" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-text text-sm">{item.label}</p>
                  <p className="text-text-dim text-xs">{item.desc}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
