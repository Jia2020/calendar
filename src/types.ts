export type Priority = 'high' | 'medium' | 'low';

export type ThemeId = 'monochrome' | 'celadon' | 'sand' | 'indigo' | 'plum';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'workday' | 'custom' | 'none';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  bgClass: string;
  accentBg: string;
  textClass: string;
  cardBg: string;
  borderClass: string;
  accentColor: string;
  btnClass: string;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex code (e.g., #ef4444)
}

export interface Task {
  id: string;
  date: string; // YYYY-MM-DD (also acts as start date for recurring tasks)
  time?: string; // HH:MM
  content: string;
  priority?: Priority;
  completed: boolean;
  hasReminder: boolean;
  reminderTime?: string; // HH:MM
  createdAt: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  recurrenceDays?: number[]; // custom weekly days: [1, 2, 3, 4, 5, 6, 0] (1=Mon, 2=Tue, ..., 0=Sun)
  recurrenceEndDate?: string; // YYYY-MM-DD end bounds
  completedDates?: string[]; // array of YYYY-MM-DD when this task was completed
  deletedDates?: string[]; // array of YYYY-MM-DD when this recurring task was deleted/hidden
  categoryId?: string; // custom category link
}

export interface VoiceParseResponse {
  success: boolean;
  action?: 'add' | 'delete_matching';
  deleteKeyword?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  content?: string;
  priority?: Priority;
  hasReminder?: boolean;
  reminderTime?: string; // HH:MM
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  recurrenceDays?: number[];
  recurrenceEndDate?: string; // YYYY-MM-DD end bounds
  error?: string;
}
