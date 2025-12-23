'use client';

import React from "react";
import { Home, User, Briefcase, Folder, Mail } from "lucide-react";

const navItems = [
  { name: "Home", icon: <Home size={18} /> },
  { name: "About", icon: <User size={18} /> },
  { name: "Projects", icon: <Folder size={18} /> },
  { name: "Experience", icon: <Briefcase size={18} /> },
  { name: "Contact", icon: <Mail size={18} /> },
];

export default function Navbar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-zinc-900 text-white flex-col p-6">
        <h2 className="text-xl font-bold mb-8">My App</h2>

        <nav className="flex flex-col gap-3">
          {navItems.map((item) => (
            <button
              key={item.name}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-zinc-800 transition"
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Top Scrollable Navbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-zinc-900 text-white z-50">
        <nav className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.name}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-full whitespace-nowrap hover:bg-zinc-700 transition"
            >
              {item.icon}
              <span className="text-sm">{item.name}</span>
            </button>
          ))}
        </nav>
      </header>
    </>
  );
}
