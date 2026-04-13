"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Fill all fields");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      router.push("/chat");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm px-4 animate-slide-up">
      <div className="glass rounded-2xl p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center glow-accent">
            <MessageSquare size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-text">VoidChat</span>
        </div>

        <h2 className="text-2xl font-bold text-text mb-1">Sign in</h2>
        <p className="text-text-dim text-sm mb-8">Welcome back to the void.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-all glow-accent flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <p className="text-center text-text-dim text-sm mt-6">
          No account?{" "}
          <Link href="/auth/signup" className="text-accent hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
