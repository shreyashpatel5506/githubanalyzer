"use client";

import { X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LimitReachedModal({ open, onClose, resetInHours }) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 text-white rounded-2xl w-[360px] p-6 relative animate-scaleIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="bg-white/10 p-3 rounded-full">
            <Zap className="text-yellow-400" />
          </div>

          <h2 className="text-xl font-semibold">
            Free limit reached
          </h2>

          <p className="text-sm text-gray-400">
            You’ve used all free analyses.
            Upgrade to unlock unlimited + private repos.
          </p>

          <button
            onClick={() => router.push("/pricing")}
            className="w-full bg-white text-black py-2 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Upgrade to Pro
          </button>

          <p className="text-xs text-gray-500">
            Or come back in {resetInHours} hours
          </p>
        </div>
      </div>
    </div>
  );
}
