"use client";
import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import Layout from "@/app/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/Card";
import { Crown, ShieldCheck, Zap, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
function planLabel(plan) {
  if (plan === "pro_plus") return "PRO+";
  if (plan === "pro") return "PRO";
  return "FREE";
}
function PlanIcon({ plan }) {
  if (plan === "pro_plus") return _jsx(Crown, { className: "w-5 h-5" });
  if (plan === "pro") return _jsx(Zap, { className: "w-5 h-5" });
  return _jsx(ShieldCheck, { className: "w-5 h-5" });
}
function usagePercent(used, limit) {
  if (limit <= 0 || limit === -1) return 0;
  return Math.min(100, (used / limit) * 100);
}
function formatLimit(limit) {
  return limit === -1 ? "Unlimited" : String(limit);
}
export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/");
            return null;
          }
        }
        return res.json();
      })
      .then((payload) => {
        if (!mounted || !payload) return;
        setData(payload);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);
  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/");
  };
  return _jsx(Layout, {
    children: _jsxs("div", {
      className:
        "max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500",
      children: [
        _jsxs("div", {
          className: "flex items-center justify-between gap-4 flex-wrap",
          children: [
            _jsxs("div", {
              children: [
                _jsx("h1", {
                  className:
                    "text-3xl font-black text-gray-900 dark:text-white",
                  children: "My Profile",
                }),
                _jsx("p", {
                  className: "text-gray-500 dark:text-gray-400",
                  children: "Account plan, usage limits, and feature access.",
                }),
              ],
            }),
            _jsxs("div", {
              className: "flex gap-2",
              children: [
                _jsx(Link, {
                  href: "/pricing",
                  className:
                    "px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition",
                  children: "Manage Plan",
                }),
                _jsxs("button", {
                  onClick: handleLogout,
                  className:
                    "px-4 py-2 rounded-lg text-sm font-bold bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/20 transition inline-flex items-center gap-2",
                  children: [
                    _jsx(LogOut, { className: "w-4 h-4" }),
                    "Sign Out",
                  ],
                }),
              ],
            }),
          ],
        }),
        loading
          ? _jsx(Card, {
              children: _jsx(CardContent, {
                className: "py-16 flex items-center justify-center",
                children: _jsx(RefreshCw, {
                  className: "w-7 h-7 animate-spin text-emerald-600",
                }),
              }),
            })
          : !data
            ? _jsx(Card, {
                children: _jsx(CardContent, {
                  className: "py-12 text-center text-gray-500",
                  children: "Unable to load profile.",
                }),
              })
            : _jsxs(_Fragment, {
                children: [
                  _jsxs(Card, {
                    className:
                      "overflow-hidden border-none shadow-md dark:bg-gray-800/50 backdrop-blur-sm",
                    children: [
                      _jsx("div", {
                        className:
                          "h-1.5 w-full bg-linear-to-r from-emerald-500 via-blue-500 to-purple-500",
                      }),
                      _jsxs(CardContent, {
                        className: "pt-6 flex items-center gap-4",
                        children: [
                          _jsx("img", {
                            src: data.user.avatar,
                            alt: "avatar",
                            className:
                              "w-16 h-16 rounded-full ring-2 ring-emerald-500/30",
                          }),
                          _jsxs("div", {
                            children: [
                              _jsx("p", {
                                className:
                                  "text-xl font-black text-gray-900 dark:text-white",
                                children: data.user.username,
                              }),
                              _jsx("p", {
                                className:
                                  "text-sm text-gray-500 dark:text-gray-400",
                                children: data.user.email,
                              }),
                            ],
                          }),
                          _jsxs("div", {
                            className:
                              "ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-black",
                            children: [
                              _jsx(PlanIcon, { plan: data.plan }),
                              planLabel(data.plan),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs(Card, {
                    className:
                      "border-none shadow-md dark:bg-gray-800/50 backdrop-blur-sm",
                    children: [
                      _jsxs(CardHeader, {
                        children: [
                          _jsx(CardTitle, { children: "Usage & Limits" }),
                          _jsxs(CardDescription, {
                            children: [
                              "Monthly usage resets in ",
                              data.resetInHours,
                              " hours.",
                            ],
                          }),
                        ],
                      }),
                      _jsx(CardContent, {
                        className: "space-y-4",
                        children: [
                          ["Repository Scans", data.limits.repo_scan],
                          ["Profile Scans", data.limits.profile_scan],
                          ["README Generations", data.limits.readme_generation],
                          ["ESLint Analyses", data.limits.eslint_analysis],
                          ["Code Smell Scans", data.limits.code_smell_scan],
                          [
                            "Bug Detection Runs",
                            data.limits.bug_detection_usage,
                          ],
                          ["Security Scans", data.limits.security_scan_usage],
                        ].map(([label, usage]) => {
                          const value = usage;
                          return _jsxs(
                            "div",
                            {
                              children: [
                                _jsxs("div", {
                                  className:
                                    "flex justify-between text-sm mb-1",
                                  children: [
                                    _jsx("span", {
                                      className:
                                        "text-gray-600 dark:text-gray-300",
                                      children: label,
                                    }),
                                    _jsxs("span", {
                                      className:
                                        "font-bold text-gray-900 dark:text-white",
                                      children: [
                                        value.used,
                                        " / ",
                                        formatLimit(value.limit),
                                      ],
                                    }),
                                  ],
                                }),
                                value.limit !== -1 &&
                                  _jsx("div", {
                                    className:
                                      "h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden",
                                    children: _jsx("div", {
                                      className:
                                        "h-full bg-linear-to-r from-emerald-500 to-blue-500",
                                      style: {
                                        width: `${usagePercent(value.used, value.limit)}%`,
                                      },
                                    }),
                                  }),
                              ],
                            },
                            label,
                          );
                        }),
                      }),
                    ],
                  }),
                  _jsxs(Card, {
                    className:
                      "border-none shadow-md dark:bg-gray-800/50 backdrop-blur-sm",
                    children: [
                      _jsx(CardHeader, {
                        children: _jsx(CardTitle, {
                          children: "Feature Access",
                        }),
                      }),
                      _jsx(CardContent, {
                        className:
                          "grid grid-cols-1 md:grid-cols-3 gap-3 text-sm",
                        children: [
                          ["Bug Detection", data.limits.bug_detection],
                          ["Security Scanning", data.limits.security_scan],
                          ["Auto Publish PR", data.limits.pr_publish],
                        ].map(([name, enabled]) =>
                          _jsxs(
                            "div",
                            {
                              className:
                                "rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-600 dark:text-gray-300",
                                  children: name,
                                }),
                                _jsx("span", {
                                  className: enabled
                                    ? "text-emerald-500 font-bold"
                                    : "text-red-400 font-bold",
                                  children: enabled ? "Enabled" : "Locked",
                                }),
                              ],
                            },
                            name,
                          ),
                        ),
                      }),
                    ],
                  }),
                ],
              }),
      ],
    }),
  });
}
