export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  status: "online" | "offline" | "away";
  last_seen?: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: "direct" | "group";
  created_by: string;
  avatar_url?: string;
  invite_code?: string;
  created_at: string;
  members?: RoomMember[];
  last_message?: Message;
  unread_count?: number;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  user?: User;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image" | "file" | "system" | "voice";
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  is_edited: boolean;
  is_deleted: boolean;
  is_pinned?: boolean;
  created_at: string;
  sender?: User;
  reply_message?: Message;
  optimistic?: boolean;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TypingIndicator {
  room_id: string;
  user_id: string;
  username: string;
}

export interface ReadReceipt {
  id: string;
  room_id: string;
  user_id: string;
  last_read_at: string;
}
