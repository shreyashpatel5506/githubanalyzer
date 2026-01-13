"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, CodeXml, Folder, Mail, Menu, X, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { CircleUser } from "lucide-react";
import ProfileModal from "./ProfileModal";

const navItems = [
  { name: "Home", icon: <Home size={18} />, path: "/" },
  { name: "Projects", icon: <Folder size={18} />, path: "/projects" },
  { name: "TechStack", icon: <CodeXml size={18} />, path: "/tech-stack" },
  { name: "About", icon: <User size={18} />, path: "/about" },
  { name: "Contact", icon: <Mail size={18} />, path: "/contact" },
];

const GITHUB_REPO_URL = "https://github.com/shreyashpatel5506/gitprofileAi";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openProfile, setOpenProfile] = useState(false);

  const [burgerMenuOpen, setBurgerMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white text-slate-900 flex-col p-6 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 px-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            GitProfileAi
          </h2>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:bg-gray-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Star Repo Button */}
        <div className="mt-auto px-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all shadow-lg"
          >
            <Star size={18} />
            Star Repo
          </a>
        </div>
      </aside>
      {session && (
        <button
          onClick={() => setOpenProfile(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
        >
          <img
            src={session.user.image}
            className="w-8 h-8 rounded-full"
            alt="profile"
          />

          <span className="font-medium text-slate-700">
            {session.user.name || "GitHub User"}
          </span>
        </button>
      )}

      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />

      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-5 left-6 z-[60] p-3 bg-white rounded-full border border-gray-200 shadow-lg text-slate-900 transition-transform active:scale-90"
        onClick={() => setBurgerMenuOpen(!burgerMenuOpen)}
      >
        {burgerMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          burgerMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setBurgerMenuOpen(false)}
      />

      {/* Mobile Sidebar */}
      <header
        className={`md:hidden fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 z-50 shadow-2xl transition-all duration-300 ease-in-out transform ${
          burgerMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex flex-col gap-2 px-6 py-10">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setBurgerMenuOpen(false)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-gray-50 text-slate-600 active:bg-gray-100"
                }`}
              >
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span className="text-base font-bold">{item.name}</span>
              </Link>
            );
          })}

          {/* Mobile Star Repo Button */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setBurgerMenuOpen(false)}
            className="mt-6 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg"
          >
            <Star size={20} />
            Star Repo
          </a>
        </nav>
      </header>

      {/* Mobile Spacer */}
      <div className="h-16 md:hidden" />
    </>
  );
}
