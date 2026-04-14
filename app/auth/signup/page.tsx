"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Username availability check
  useEffect(() => {
    if (form.username.length < 3) { setUsernameStatus("idle"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) { setUsernameStatus("idle"); return; }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", form.username)
        .single();
      setUsernameStatus(data ? "taken" : "available");
    }, 500);

    return () => clearTimeout(timer);
  }, [form.username]);

  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, email, password } = form;
    if (!username || !email || !password) return toast.error("Fill all fields");
    if (password.length < 6) return toast.error("Password must be 6+ characters");
    if (username.length < 3) return toast.error("Username must be 3+ characters");
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return toast.error("Sirf letters, numbers aur _ allowed hain");
    if (usernameStatus === "taken") return toast.error("Ye username already le liya gaya hai");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          username,
          email,
          status: "online",
        });
      }

      toast.success("Account created! Welcome to VoidChat.");
      router.push("/chat");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("email rate") || msg.toLowerCase().includes("too many")) {
        toast.error("Bahut zyada signups ho gaye. 1 ghante baad try karo ya Supabase dashboard mein email confirmation band karo.", { duration: 6000 });
      } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        toast.error("Ye email already registered hai. Login karo.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-4 animate-slide-up">
      <div className="glass rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center glow-accent">
            <MessageSquare size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-text">VoidChat</span>
        </div>

        <h2 className="text-2xl font-bold text-text mb-1">Create account</h2>
        <p className="text-text-dim text-sm mb-8">Join the void. Stay private.</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Username */}
          <div>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                placeholder="Username (letters, numbers, _)"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                className={`w-full bg-surface border rounded-xl pl-10 pr-10 py-3 text-text text-sm placeholder:text-muted transition-colors ${
                  usernameStatus === "available" ? "border-green-500/50" :
                  usernameStatus === "taken" ? "border-red-500/50" :
                  "border-border focus:border-accent/50"
                }`}
              />
              {/* Status icon */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                )}
                {usernameStatus === "available" && <Check size={14} className="text-green-400" />}
                {usernameStatus === "taken" && <X size={14} className="text-red-400" />}
              </div>
            </div>
            {usernameStatus === "available" && (
              <p className="text-green-400 text-[10px] mt-1 ml-1">✓ Username available hai</p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-red-400 text-[10px] mt-1 ml-1">✗ Ye username already le liya gaya hai</p>
            )}
          </div>

          {/* Email */}
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button type="submit" disabled={loading || usernameStatus === "taken"}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-all glow-accent flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Create Account <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-dim text-xs">ya</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button type="button" onClick={handleGoogleSignup} disabled={loading}
          className="w-full bg-surface hover:bg-panel border border-border hover:border-accent/30 disabled:opacity-50 text-text rounded-xl py-3 text-sm font-medium transition-all flex items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-text-dim text-sm mt-6">
          Have an account?{" "}
          <Link href="/auth/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
