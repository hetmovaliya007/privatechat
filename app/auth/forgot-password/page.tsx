"use client";
import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Email daalo");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
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

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Email Bhej Diya!</h2>
            <p className="text-text-dim text-sm mb-6">
              <span className="text-text font-medium">{email}</span> pe reset link bhej diya hai. Inbox check karo.
            </p>
            <Link href="/auth/login" className="text-accent text-sm hover:underline flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Login pe wapas jao
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-text mb-1">Password Reset</h2>
            <p className="text-text-dim text-sm mb-8">Apna email daalo — reset link bhejenge.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <button type="submit" disabled={loading}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-all glow-accent flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Reset Link Bhejo <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <p className="text-center text-text-dim text-sm mt-6">
              <Link href="/auth/login" className="text-accent hover:underline flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Login pe wapas jao
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
