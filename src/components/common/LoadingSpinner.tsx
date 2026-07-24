export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-brand-500">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
      {label && <p className="text-sm text-brand-400">{label}</p>}
    </div>
  );
}
