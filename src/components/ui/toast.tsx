"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleAlert, Info } from "lucide-react";

type Toast = { id: number; message: string; tone: "good" | "bad" | "info" };

const ToastContext = React.createContext<{
  notify: (message: string, tone?: Toast["tone"]) => void;
}>({ notify: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const notify = React.useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4500);
  }, []);

  const icons = { good: CircleCheck, bad: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[var(--radius-control)]",
                "px-4 py-3 text-[14px] shadow-[var(--shadow-lift)]",
                toast.tone === "good" && "bg-leaf text-white",
                toast.tone === "bad" && "bg-flag text-white",
                toast.tone === "info" && "bg-ink text-white",
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="leading-snug">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
