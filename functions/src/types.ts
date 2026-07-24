export type Period = "morning" | "afternoon" | "evening";

export type NotificationType =
  | "activity_upcoming"
  | "activity_due"
  | "activity_late"
  | "period_morning"
  | "period_afternoon"
  | "period_evening"
  | "new_activity"
  | "activity_changed"
  | "new_message"
  | "new_reward"
  | "reward_achieved"
  | "medication_reminder"
  | "daily_summary"
  | "activity_pending";

export interface NotificationPreferences {
  activityUpcoming: boolean;
  activityDue: boolean;
  activityLate: boolean;
  periodSummary: boolean;
  newActivity: boolean;
  activityChanged: boolean;
  newMessage: boolean;
  newReward: boolean;
  rewardAchieved: boolean;
  medicationReminder: boolean;
  dailySummary: boolean;
}

export interface UserDoc {
  uid: string;
  role: "professional" | "patient" | "guardian";
  name: string;
  fcmTokens?: string[];
  notificationPrefs?: NotificationPreferences;
  active: boolean;
}

export interface PatientDoc {
  uid: string;
  name: string;
  points: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  active: boolean;
}

export interface RoutineItemDoc {
  id: string;
  patientId: string;
  professionalId: string;
  title: string;
  icon: string;
  period: Period;
  time?: string;
  date?: string;
  frequency: "once" | "daily" | "weekly" | "custom_days";
  weekdays?: number[];
  category: string;
  points: number;
  active: boolean;
  notificationConfig?: {
    enabled: boolean;
    leadMinutes: number;
    remindersCount: number;
    repeatIfLate: boolean;
    customMessage?: string;
  };
}

export interface CompletionDoc {
  id: string;
  routineItemId: string;
  patientId: string;
  date: string;
  status: "completed" | "partial" | "skipped";
  feeling?: string;
  pointsAwarded: number;
}
