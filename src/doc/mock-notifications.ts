export * from "../services/notifications";
import type { NotificationDoc } from "@/types";

export function subscribeToNotifications(_r: string, cb: (n: NotificationDoc[]) => void) {
  cb([]);
  return () => undefined;
}
