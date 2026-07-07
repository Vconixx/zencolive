"use client";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
};

export default function Toast({ message, type = "success" }: ToastProps) {
  if (!message) return null;

  const color =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-indigo-600";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] animate-[toastIn_0.25s_ease-out]">
      <div
        className={`${color} text-white px-5 py-3 rounded-xl shadow-2xl border border-white/10 font-bold text-sm`}
      >
        {message}
      </div>

      <style jsx global>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translate(-50%, 20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}