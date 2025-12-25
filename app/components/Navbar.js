'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Briefcase, Folder, Mail } from "lucide-react";

const navItems = [
  { name: "Home", icon: <Home size={18} />, path: "/" },
  { name: "Projects", icon: <Folder size={18} />, path: "/projects" },
  { name: "About", icon: <User size={18} />, path: "/about" },
  { name: "Contact", icon: <Mail size={18} />, path: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64  border-r border-gray-100 text-slate-900 flex-col p-6 z-50">
        <div className="flex items-center gap-2 mb-10 px-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">GitProfileAi</h2>
        </div>

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
                <span className={`${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Top Scrollable Navbar */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 shadow-sm">
        <nav className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all ${
                  isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                    : "bg-gray-50 text-slate-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span className="text-sm font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      
      {/* Mobile Spacer (to prevent content from hiding under fixed header) */}
      <div className="h-16 md:hidden"></div>
    </>
  );
}