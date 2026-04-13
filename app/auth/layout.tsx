export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex items-center justify-center bg-void noise-bg relative overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-2/5 rounded-full blur-3xl pointer-events-none" />
      {children}
    </div>
  );
}
