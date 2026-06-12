import { useEffect } from "react";
import { Button } from "./UI";
import { IFlag, ITrash, IX } from "./icons";

interface Props {
  open: boolean;
  title: string;
  message: string;
  variant?: "danger" | "warning";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message,
  variant = "warning",
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const tone = variant === "danger"
    ? { bg: "bg-rose-100", fg: "text-rose-600", icon: <ITrash /> }
    : { bg: "bg-amber-100", fg: "text-amber-600", icon: <IFlag /> };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex items-start gap-4">
          <div className={`w-12 h-12 ${tone.bg} ${tone.fg} rounded-xl grid place-items-center flex-shrink-0`}>
            {tone.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>
              <button
                onClick={onCancel}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                aria-label="Đóng"
              >
                <IX width={18} height={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
