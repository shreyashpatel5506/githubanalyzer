"use client";

import React, { useEffect, useState } from "react";
import { Linkedin, Twitter, Github, Share2, X } from "lucide-react";

export default function RightProfileSidebar() {
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);

  // ✅ NEW: state for copy success
  const [copied, setCopied] = useState(false);

  /* 🔁 Load profile from localStorage */
  useEffect(() => {
    const stored = localStorage.getItem("githubData");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (parsed?.profile) {
        setProfile(parsed.profile);
      }
    } catch (e) {
      console.error("Invalid githubData");
    }
  }, []);

  if (!profile) return null;

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  // ✅ NEW: copy handler
  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy profile link", error);
    }
  };

  return (
    <>
      {/* 📱 MOBILE SHARE BUTTON ONLY (HIDE WHEN OPEN) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="
            md:hidden
            fixed top-5 right-5
            z-40
            bg-indigo-600
            text-white
            p-3
            rounded-xl
            shadow-lg
            hover:bg-indigo-500
            transition
          "
          aria-label="Open share sidebar"
        >
          <Share2 size={20} strokeWidth={2.5} />
        </button>
      )}

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-[60]"
        />
      )}

      {/* 👉 SIDEBAR */}
      <aside
        className={`
          fixed top-0 right-0 h-screen w-80
          bg-slate-900 border-l border-slate-700
          z-[65] transition-transform duration-300

          /* MOBILE */
          ${open ? "translate-x-0" : "translate-x-full"}

          /* DESKTOP */
          md:translate-x-0
        `}
      >
        {/* 📱 CLOSE BUTTON */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
          className="
            md:hidden
            absolute top-4 right-4
            z-50
            bg-slate-800
            hover:bg-slate-700
            text-white
            p-3
            rounded-full
            shadow-xl
            active:scale-95
            transition
          "
        >
          <X size={26} strokeWidth={3} />
        </button>

        {/* CONTENT */}
        <div className="flex flex-col items-center text-center px-6 pt-16">
          <img
            src={profile.avatarUrl}
            alt="Profile"
            className="w-28 h-28 rounded-2xl border border-slate-600 shadow-lg"
          />

          <h3 className="mt-4 text-xl font-black text-slate-100">
            {profile.name || profile.username}
          </h3>

          <p className="text-slate-400 mb-6">@{profile.username}</p>

          {/* 🔗 COPY LINK */}
          <button
            onClick={handleCopyProfileLink}
            className="w-full mb-4 bg-indigo-600 hover:bg-indigo-500
                       text-white font-bold py-3 rounded-xl transition"
          >
            🔗 {copied ? "Copied" : "Copy Profile Link"}
          </button>

          {/* 🌐 SOCIAL LINKS */}
          <div className="w-full space-y-3">
            <SocialButton
              icon={<Linkedin size={18} />}
              label="Share on LinkedIn"
              url={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                shareUrl
              )}`}
            />

            <SocialButton
              icon={<Twitter size={18} />}
              label="Share on Twitter"
              url={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                shareUrl
              )}&text=Check%20out%20this%20GitHub%20profile`}
            />

            <SocialButton
              icon={<Github size={18} />}
              label="View GitHub"
              url={profile.profileUrl}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

/* ---------- SOCIAL BUTTON ---------- */

function SocialButton({ icon, label, url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 w-full px-4 py-3
                 bg-slate-800 hover:bg-slate-700
                 rounded-xl text-slate-200 font-medium transition"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
