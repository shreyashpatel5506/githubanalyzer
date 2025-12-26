"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, CodeXml, Folder, Mail, Menu, X } from "lucide-react";

const navItems = [
  { name: "Home", icon: <Home size={18} />, path: "/" },
  { name: "Projects", icon: <Folder size={18} />, path: "/projects" },
  { name: "TechStack", icon: <CodeXml size={18} />, path: "/tech-stack" },
  { name: "About", icon: <User size={18} />, path: "/about" },
  { name: "Contact", icon: <Mail size={18} />, path: "/contact" },

];

export default function Navbar() {
  const pathname = usePathname();
  const [burgerMenuOpen, setBurgerMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white text-slate-900 flex-col p-6 z-50">
        <div className="flex items-center gap-2 mb-10 px-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 text-background">
            GitProfileAi
          </h2>
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
                <span
                  className={`${
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <button
        className="md:hidden fixed top-5 left-6 z-[60] p-3 bg-white rounded-full border border-gray-200 shadow-lg text-slate-900 transition-transform active:scale-90"
        onClick={() => setBurgerMenuOpen(!burgerMenuOpen)}
      >
        {burgerMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div 
        className={`md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          burgerMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setBurgerMenuOpen(false)}
      />
      <header 
        className={`md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 shadow-2xl transition-all duration-300 ease-in-out transform ${
          burgerMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-2 px-6 pt-20 pb-8">
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
        </nav>
      </header>

      {/* Mobile Spacer */}
      <div className="h-16 md:hidden"></div>
    </>
  );
}
