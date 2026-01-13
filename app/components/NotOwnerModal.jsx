"use client";

import { X, Shield } from "lucide-react";

export default function NotOwnerModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 text-white rounded-2xl w-[400px] p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto bg-white/10 p-3 rounded-full">
            <Shield className="text-red-400" />
          </div>

          <h2 className="text-xl font-semibold">
            You are not the profile owner
          </h2>

          <p className="text-sm text-gray-400">
            AI analysis and private repository insights are only available
            when you are logged in with the same GitHub account
            as the searched profile.
          </p>

          <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300">
            👉 If you are a recruiter or reviewing another profile,
            you can still explore public GitHub analysis.
          </div>

          <button
            onClick={onClose}
            className="w-full bg-white text-black py-2 rounded-lg font-medium"
          >
            Continue with Public Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
