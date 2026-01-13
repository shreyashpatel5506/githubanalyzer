"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ProfileModal({ open, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (open) {
      fetch("/api/profile")
        .then((res) => res.json())
        .then(setData);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal */}
      <div className="relative w-[380px] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-2xl p-6 text-white animate-scaleIn">
        {!data ? (
          <div className="py-10 text-center text-slate-400">
            Loading profile…
          </div>
        ) : (
          <>
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X />
            </button>

            {/* Profile */}
            <div className="flex flex-col items-center gap-3">
              <img
                src={data.user.avatar}
                className="w-20 h-20 rounded-full ring-2 ring-emerald-500/50"
                alt="avatar"
              />
              <h2 className="text-lg font-semibold">
                {data.user.username}
              </h2>
              <p className="text-sm text-slate-400">
                {data.user.email}
              </p>
            </div>

            {/* Plan */}
            <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Plan</span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  {data.plan.toUpperCase()}
                </span>
              </div>

              {/* Usage */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Usage</span>
                  <span>
                    {data.used} / {data.limit}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        (data.used / data.limit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                {data.used >= data.limit && (
                  <p className="mt-3 text-xs text-red-400">
                    Limit reached. Resets in {data.resetInHours} hours.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Animation */}
      <style jsx>{`
        .animate-scaleIn {
          animation: scaleIn 0.18s ease-out;
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
