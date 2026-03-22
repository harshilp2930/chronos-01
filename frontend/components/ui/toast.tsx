import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "success", onClose, duration = 2500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed z-50 bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-semibold flex items-center gap-2 transition-all
        ${type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
      role="alert"
    >
      {type === "success" ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      <span>{message}</span>
    </div>
  );
}
