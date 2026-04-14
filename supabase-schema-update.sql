-- ============================================
-- SCHEMA UPDATE — Run this in Supabase SQL Editor
-- ============================================

-- 1. Add is_pinned to messages (if not exists)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- 2. Add voice message type
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('text', 'image', 'file', 'system', 'voice'));

-- 3. Add invite_code to rooms (if not exists)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

-- 4. READ RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS public.read_receipts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Read receipts viewable by room members"
    ON public.read_receipts FOR SELECT TO authenticated
    USING (room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upsert own read receipts"
    ON public.read_receipts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own read receipts"
    ON public.read_receipts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. BLOCKED USERS TABLE
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their blocks"
    ON public.blocked_users FOR ALL TO authenticated USING (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Add last_seen to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 7. Realtime for read_receipts
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.read_receipts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_read_receipts_room_user ON public.read_receipts(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_pinned ON public.messages(room_id, is_pinned);

-- Storage: allow audio files
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'audio/webm')
WHERE id = 'chat-files' AND NOT ('audio/webm' = ANY(allowed_mime_types));

UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'audio/mp4')
WHERE id = 'chat-files' AND NOT ('audio/mp4' = ANY(allowed_mime_types));

UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'audio/ogg')
WHERE id = 'chat-files' AND NOT ('audio/ogg' = ANY(allowed_mime_types));
