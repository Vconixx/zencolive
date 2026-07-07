"use client";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "Vazgeç",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#2b2d31] border border-white/10 shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">
        <div className="p-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 ${
            danger ? "bg-red-600/20" : "bg-indigo-600/20"
          }`}>
            {danger ? "⚠️" : "💬"}
          </div>

          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="text-sm text-gray-400 mt-2">{description}</p>
        </div>

        <div className="bg-[#232428] p-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-[#404249] hover:bg-[#50535a] py-3 font-bold transition"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-3 font-bold transition hover:scale-[1.02] ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}