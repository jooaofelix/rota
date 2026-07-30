export * from "../firebase/messaging";

/** "default" mantém o cartão explicativo de permissão visível, como no documento original. */
export function currentNotificationPermission(): NotificationPermission {
  return "default";
}
