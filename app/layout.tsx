import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VoidChat — Private & Encrypted",
  description: "End-to-end encrypted private chat. No tracking. No ads. Just you.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrains.variable}`}>
      <body className="bg-void text-text antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#12121c",
              color: "#e2e2f0",
              border: "1px solid #1e1e2e",
              fontFamily: "var(--font-sora)",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
