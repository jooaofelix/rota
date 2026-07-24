import { useEffect, useState } from "react";
import { subscribeToNotifications, markNotificationRead } from "@/services/notifications";
import type { NotificationDoc } from "@/types";
import { BottomSheet } from "@/components/common/BottomSheet";
import { EmptyState } from "@/components/common/EmptyState";

export function NotificationsBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeToNotifications(userId, setNotifications), [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-full text-xl active:bg-brand-50">
        🔔
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Notificações">
        {notifications.length === 0 ? (
          <EmptyState icon="🔕" title="Nenhuma notificação ainda" />
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`card text-left ${n.read ? "opacity-60" : "border-2 border-brand-200"}`}
              >
                <p className="text-sm font-bold text-brand-800">{n.title}</p>
                <p className="text-xs text-brand-500">{n.body}</p>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
