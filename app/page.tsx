"use client";
import Link from "next/link";
import { Shield, Zap, Lock, MessageSquare, Users, Image } from "lucide-react";

const features = [
  { icon: Lock, title: "End-to-End Encrypted", desc: "AES-256 encryption on every message. Nobody can read your chats." },
  { icon: Zap, title: "Real-Time Messaging", desc: "Instant message delivery with live typing indicators." },
  { icon: Users, title: "Group Rooms", desc: "Create group chats with unlimited members." },
  { icon: MessageSquare, title: "1-on-1 DMs", desc: "Private direct messages with anyone on the platform." },
  { icon: Image, title: "File & Image Sharing", desc: "Share images, documents, and files securely." },
  { icon: Shield, title: "No Tracking", desc: "No ads, no tracking, no selling your data. Ever." },
];

export default function HomePage() {
  return (
    <main className="h-screen overflow-y-auto noise-bg bg-void flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 glass sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center glow-accent">
            <MessageSquare size={16} className="text-white" />
          </div>
          <span className="font-sans font-bold text-lg text-text">VoidChat</span>
        </div>
        <div className="flex gap-2">
          <Link href="/auth/login" prefetch
            className="px-3 py-2 text-xs sm:text-sm text-text-dim hover:text-text transition-colors touch-manipulation select-none">
            Sign In
          </Link>
          <Link href="/auth/signup" prefetch
            className="px-3 py-2 text-xs sm:text-sm bg-accent hover:bg-accent/90 text-white rounded-lg transition-all glow-accent touch-manipulation select-none">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-mono mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          AES-256 Encrypted · Zero Logs
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-text leading-tight mb-6 max-w-4xl">
          Chat in the{" "}
          <span className="relative inline-block">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-2">
              void
            </span>
          </span>
          .{" "}
          <br />
          Leave no trace.
        </h1>

        <p className="text-text-dim text-lg max-w-xl mb-10 leading-relaxed">
          Private, encrypted, real-time chat. No tracking. No ads.
          Just secure conversations between you and the people you trust.
        </p>

        <div className="flex gap-4">
          <Link href="/auth/signup" prefetch
            className="px-8 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-all glow-accent text-sm touch-manipulation select-none">
            Start Chatting — Free
          </Link>
          <Link href="/auth/login" prefetch
            className="px-8 py-3 border border-border hover:border-accent/50 text-text-dim hover:text-text rounded-xl font-medium transition-all text-sm touch-manipulation select-none">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 pb-20 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title}
              className="p-5 rounded-2xl border border-border bg-panel hover:border-accent/30 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <f.icon size={18} className="text-accent" />
              </div>
              <h3 className="font-semibold text-text mb-1.5 text-sm">{f.title}</h3>
              <p className="text-text-dim text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
