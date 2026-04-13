# 🔐 VoidChat — Private & Encrypted Chat App

> End-to-end encrypted, real-time private chat with group rooms and 1-on-1 DMs.  
> Built with Next.js 14 + Supabase + Vercel. **100% Free to host.**

![VoidChat](https://img.shields.io/badge/Stack-Next.js%2014-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Database-Supabase-green?style=for-the-badge&logo=supabase)
![Vercel](https://img.shields.io/badge/Hosting-Vercel-black?style=for-the-badge&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **E2E Encryption** | AES-256 encryption on every message via crypto-js |
| ⚡ **Real-Time Messaging** | Instant messages using Supabase Realtime |
| 💬 **1-on-1 DMs** | Private direct messages between any two users |
| 👥 **Group Rooms** | Create group chats with unlimited members |
| 📁 **File & Image Sharing** | Upload images, PDFs, docs (up to 5MB) via Supabase Storage |
| 💬 **Reply to Messages** | Reply to specific messages with context |
| ✏️ **Edit & Delete** | Edit or delete your own messages |
| ⌨️ **Typing Indicators** | Live "X is typing..." indicator |
| 🟢 **Online Status** | Real-time online/offline/away user status |
| 🔎 **Room Search** | Search through your rooms in the sidebar |
| 🎨 **Modern Dark UI** | Premium dark theme with glassmorphism design |
| 📱 **Responsive** | Works on desktop and mobile browsers |

---

## 🛠️ Tech Stack

```
Frontend    → Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend     → Supabase (PostgreSQL + Realtime + Auth + Storage)
Encryption  → crypto-js (AES-256)
Hosting     → Vercel (free forever)
Database    → Supabase PostgreSQL (500MB free)
File Store  → Supabase Storage (1GB free)
```

---

## 📋 Prerequisites

Before you start, install these on your computer:

- **Node.js** v18 or higher → https://nodejs.org
- **Git** → https://git-scm.com
- **A code editor** (VS Code recommended) → https://code.visualstudio.com

Check if installed:
```bash
node --version   # Should show v18+
npm --version    # Should show 8+
git --version    # Should show 2+
```

---

## 🚀 Complete Setup Guide

### STEP 1 — Get the Project

```bash
# Download project
git clone https://github.com/yourusername/privatechat.git

# Go into project folder
cd privatechat

# Install all packages (wait ~1-2 minutes)
npm install
```

---

### STEP 2 — Create Supabase Account & Project

1. Go to **https://supabase.com** and click **"Start your project"**
2. Sign up with GitHub (free)
3. Click **"New Project"**
4. Fill in:
   - **Name:** `privatechat` (or anything you like)
   - **Database Password:** create a strong password (save it somewhere!)
   - **Region:** choose closest to you (e.g., Southeast Asia for India)
5. Click **"Create new project"** — wait ~2 minutes for setup

---

### STEP 3 — Set Up the Database

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Open the file `supabase-schema.sql` from this project
4. Copy ALL the content and paste it into the SQL editor
5. Click **"Run"** (green button)
6. You should see: `Success. No rows returned`

This creates all tables, security rules, storage bucket, and auto-signup trigger.

---

### STEP 4 — Get Your Supabase Keys

1. In Supabase dashboard, go to **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public key** → a long string starting with `eyJ...`

---

### STEP 5 — Create Environment File

1. In your project folder, create a file named `.env.local`
2. Add the following (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ENCRYPTION_KEY=make-up-any-32-char-random-string!!
```

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzabcdef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
NEXT_PUBLIC_ENCRYPTION_KEY=MySecretKey2024VoidChatPrivate!!
```

> ⚠️ **Important:** Never share your `.env.local` file or commit it to GitHub!  
> The `ENCRYPTION_KEY` can be any random string of at least 16 characters.

---

### STEP 6 — Enable Realtime in Supabase

1. In Supabase dashboard, go to **Database** → **Replication**
2. Make sure these tables have Realtime enabled (toggle ON):
   - `messages`
   - `profiles`
   - `room_members`

---

### STEP 7 — Run Locally

```bash
npm run dev
```

Open your browser and go to: **http://localhost:3000**

You should see the VoidChat landing page! 🎉

---

## 🌐 Deploy to Vercel (Free Live Hosting)

### STEP 1 — Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/yourusername/privatechat.git
git push -u origin main
```

### STEP 2 — Deploy on Vercel

1. Go to **https://vercel.com** and sign up with GitHub (free)
2. Click **"Add New Project"**
3. Click **"Import"** next to your `privatechat` repository
4. In **"Environment Variables"** section, add all 3 variables from your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL       → your supabase url
   NEXT_PUBLIC_SUPABASE_ANON_KEY  → your anon key
   NEXT_PUBLIC_ENCRYPTION_KEY     → your secret key
   ```
5. Click **"Deploy"**

Wait ~2 minutes. You'll get a free URL like:  
`https://privatechat-abc123.vercel.app` 🚀

---

## 📁 Project Structure

```
privatechat/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with fonts
│   ├── globals.css                 # Global styles
│   ├── auth/
│   │   ├── layout.tsx              # Auth page layout
│   │   ├── login/page.tsx          # Login page
│   │   └── signup/page.tsx         # Signup page
│   └── chat/
│       ├── layout.tsx              # Chat layout with sidebar
│       ├── page.tsx                # Chat home (no room selected)
│       ├── settings/page.tsx       # User settings
│       └── [roomId]/page.tsx       # Individual chat room
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx             # Left sidebar with rooms list
│   └── chat/
│       └── CreateRoomModal.tsx     # Modal to create room/DM
├── lib/
│   ├── supabase.ts                 # Supabase client
│   └── encryption.ts              # AES-256 encrypt/decrypt
├── types/
│   └── index.ts                   # TypeScript types
├── supabase-schema.sql             # Database setup SQL
├── .env.local.example             # Environment variables template
├── vercel.json                    # Vercel deployment config
├── tailwind.config.ts             # Tailwind CSS config
└── package.json                   # Dependencies
```

---

## 🔐 How Encryption Works

```
User types message
       ↓
AES-256 encrypt with ENCRYPTION_KEY
       ↓
Encrypted cipher text stored in Supabase
       ↓
Other user fetches encrypted text
       ↓
AES-256 decrypt with same ENCRYPTION_KEY
       ↓
User sees original message
```

- Messages are **never stored as plain text** in the database
- Even if someone hacks your Supabase, they only see encrypted gibberish
- The encryption key lives only in your environment variables

---

## 💡 How to Use VoidChat

### Create Account
1. Go to your app URL
2. Click **"Get Started"**
3. Fill in username, email, password
4. You're in!

### Start a Group Chat
1. Click **"+"** button in the sidebar
2. Select **"Group Room"** tab
3. Enter room name → **"Create Group"**
4. Share your app URL with friends to join!

### Start a Private DM
1. Click **"+"** button in sidebar
2. Select **"Direct Message"** tab
3. Enter friend's email address (they must have an account)
4. Click **"Start DM"**

### Send Files/Images
- Click the 📎 **paperclip icon** in the message input
- Select any image, PDF, or document (max 5MB)
- File is uploaded and shared instantly

### Reply to a Message
- Hover over any message
- Click the **reply arrow** icon
- Type your response

---

## 🔧 Common Issues & Fixes

### "Supabase URL not found" error
- Check your `.env.local` file exists and has correct values
- Restart dev server: `Ctrl+C` then `npm run dev`

### Messages not appearing in real-time
- Go to Supabase → Database → Replication
- Enable Realtime for `messages` table

### File upload not working
- Check Supabase Storage → `chat-files` bucket exists
- Re-run the SQL schema file

### Login not working
- Go to Supabase → Authentication → Providers
- Make sure **Email** provider is enabled

### Build error on Vercel
- Check all 3 environment variables are added in Vercel project settings
- Redeploy after adding variables

---

## 🆓 Free Tier Limits

| Service | Free Limit | Enough for? |
|---------|-----------|-------------|
| Supabase DB | 500MB | ~500K messages |
| Supabase Storage | 1GB | ~200 images |
| Supabase Auth | Unlimited users | ✅ |
| Supabase Realtime | 200 concurrent | ~200 online users |
| Vercel | 100GB bandwidth | ~50K visitors/month |

---

## 📝 License

MIT License — Free to use, modify, and distribute.

---

## 🙋 Support

If something breaks:
1. Check the **Common Issues** section above
2. Make sure your `.env.local` is correct
3. Try re-running the SQL schema in Supabase

---

*Built with ❤️ — VoidChat. Chat in the void. Leave no trace.*
