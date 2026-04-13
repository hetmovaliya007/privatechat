export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  status: "online" | "offline" | "away";
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: "direct" | "group";
  created_by: string;
  avatar_url?: string;
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
  type: "text" | "image" | "file" | "system";
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: User;
  reply_message?: Message;
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
