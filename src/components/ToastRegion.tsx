'use client';

import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import type { ToastMessage } from '@/types/booking';

interface ToastRegionProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<
  ToastMessage['type'],
  { container: string; iconColor: string }
> = {
  info: {
    container: 'border-slate-200 bg-white text-[#0F172A]',
    iconColor: 'text-slate-700',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    iconColor: 'text-emerald-600',
  },
  warning: {
    container: 'border-amber-300 bg-amber-50 text-amber-950',
    iconColor: 'text-amber-600',
  },
  error: {
    container: 'border-rose-300 bg-[#FFF1F2] text-[#881337]',
    iconColor: 'text-[#D84E55]',
  },
};

export function ToastRegion({ toasts, onDismiss }: ToastRegionProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print pointer-events-none fixed inset-x-0 top-16 z-50 mx-auto flex max-w-md flex-col gap-2 px-3 sm:top-20"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'warning'
              ? AlertTriangle
              : toast.type === 'error'
                ? AlertCircle
                : Info;

        return (
          <div
            key={toast.id}
            role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all duration-200 ${style.container}`}
          >
            <Icon className={`mt-0.5 size-5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
