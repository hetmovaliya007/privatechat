"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Mail, Lock, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error("Fill all fields");
    setLoading(true);
    try {
      let emailToUse = identifier.trim();

      // Agar email nahi hai toh username se email dhundo
      if (!identifier.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", identifier.trim())
          .single();

        if (profileError || !profile) {
          toast.error("Username nahi mila — email try karo");
          setLoading(false);
          return;
        }
        emailToUse = profile.email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (error) throw error;
      toast.success("Welcome back!");
      router.push("/chat");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const isEmail = identifier.includes("@");

  return (
    <div className="w-full max-w-sm px-4 animate-slide-up">
      <div className="glass rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center glow-accent">
            <MessageSquare size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-text">VoidChat</span>
        </div>

        <h2 className="text-2xl font-bold text-text mb-1">Sign in</h2>
        <p className="text-text-dim text-sm mb-8">Welcome back to the void.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email or Username */}
          <div className="relative">
            {isEmail
              ? <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
              : <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            }
            <input
              type="text"
              placeholder="Email ya Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-text text-sm placeholder:text-muted focus:border-accent/50 transition-colors"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-accent text-xs hover:underline">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-all glow-accent flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-dim text-xs">ya</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button type="button" onClick={handleGoogleLogin} disabled={loading}
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
          No account?{" "}
          <Link href="/auth/signup" className="text-accent hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
