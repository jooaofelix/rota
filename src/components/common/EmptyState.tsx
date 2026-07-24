interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "🌿", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="text-base font-bold text-brand-800">{title}</p>
      {description && <p className="text-sm text-brand-400">{description}</p>}
      {action && <div className="mt-3 w-full">{action}</div>}
    </div>
  );
}
