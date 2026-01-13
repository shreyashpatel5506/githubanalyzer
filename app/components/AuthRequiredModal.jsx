"use client";

import { signIn } from "next-auth/react";
import { X, Github } from "lucide-react";

export default function AuthRequiredModal({ open, onClose }) {
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
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Github className="text-emerald-400" size={28} />
          </div>

          <h2 className="text-lg font-semibold">
            Login required
          </h2>

         <p className="text-sm text-gray-400 text-center">
  To unlock full analysis, please sign in with the
  <span className="text-white font-medium"> same GitHub account </span>
  as the searched profile.
</p>

        </div>

        {/* Action */}
        <button
          onClick={() => signIn("github")}
          className="mt-6 w-full flex items-center justify-center gap-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 transition-all active:scale-[0.98]"
        >
          <Github size={18} />
          Continue with GitHub
        </button>
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
