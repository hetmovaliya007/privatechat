"use client";
import { MessageSquare, Shield, Lock, Hash } from "lucide-react";

export default function ChatHome() {
  return (
    <div className="flex-1 flex items-center justify-center bg-void">
      <div className="text-center flex flex-col items-center gap-5">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center glow-accent">
            <MessageSquare size={36} className="text-accent" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Shield size={9} className="text-accent" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-text mb-2">Select a room</h2>
          <p className="text-text-dim text-sm max-w-xs leading-relaxed">
            Choose a conversation from the sidebar or create a new one to start chatting securely.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border rounded-full text-xs text-text-dim">
            <Lock size={10} className="text-accent" />
            E2E Encrypted
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border rounded-full text-xs text-text-dim">
            <Hash size={10} className="text-accent" />
            Group Rooms
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-panel border border-border rounded-full text-xs text-text-dim">
            <Shield size={10} className="text-accent" />
            Private DMs
          </div>
        </div>
      </div>
    </div>
  );
}
