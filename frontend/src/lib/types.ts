export type Role = "admin" | "teacher" | "student";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  parent_id?: number | null;
  is_active: boolean;
  avatar_url?: string | null;
}

export interface LessonRef {
  id: number;
  title: string;
  score: number;
}

export interface AskResponse {
  session_id: number;
  answer: string;
  lesson_refs: LessonRef[];
  topic?: string | null;
  response_time_ms: number;
}

export interface ChatMessage {
  id: number;
  sender: "student" | "bot";
  content: string;
  lesson_id?: number | null;
  topic_id?: number | null;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title?: string | null;
  started_at: string;
  message_count: number;
}

export interface Alert {
  id: number;
  alert_type: string;
  severity: "low" | "medium" | "high";
  message: string;
  is_read: boolean;
  created_at: string;
}
