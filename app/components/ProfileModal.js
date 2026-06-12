"use client";
import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { X, Crown, Zap, Shield, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function ProfileModal({ open, onClose }) {
  const [data, setData] = useState(null);
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    onClose();
    router.replace("/");
  };
  useEffect(() => {
    if (open) {
      fetch("/api/profile")
        .then((res) => res.json())
        .then(setData)
        .catch((err) => console.error("Failed to load profile", err));
    }
  }, [open]);
  if (!open) return null;
  const getPlanColor = (plan) => {
    switch (plan.toLowerCase()) {
      case "pro_plus":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "pro":
        return "bg-gradient-to-r from-purple-500 to-pink-500";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };
  const getPlanName = (plan) => {
    switch (plan.toLowerCase()) {
      case "pro_plus":
        return "PRO+";
      case "pro":
        return "PRO";
      default:
        return "FREE";
    }
  };
  const getPlanIcon = (plan) => {
    switch (plan.toLowerCase()) {
      case "pro_plus":
        return _jsx(Crown, { className: "w-5 h-5" });
      case "pro":
        return _jsx(Zap, { className: "w-5 h-5" });
      default:
        return _jsx(Shield, { className: "w-5 h-5" });
    }
  };
  const formatLimit = (limit) => {
    return limit === -1 ? "Unlimited" : limit;
  };
  const getUsagePercentage = (used, limit) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };
  return _jsxs("div", {
    className: "fixed inset-0 z-100 flex items-center justify-center p-4",
    children: [
      _jsx("div", {
        onClick: onClose,
        className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
      }),
      _jsx("div", {
        className:
          "relative w-full max-w-md rounded-2xl border border-white/20 bg-linear-to-br from-gray-900 to-purple-900 shadow-2xl text-white max-h-[90vh] overflow-y-auto",
        children: !data
          ? _jsx("div", {
              className: "py-20 text-center text-gray-400",
              children: "Loading profile\u2026",
            })
          : _jsxs(_Fragment, {
              children: [
                _jsx("button", {
                  onClick: onClose,
                  className:
                    "absolute top-4 right-4 text-gray-400 hover:text-white transition-colors",
                  children: _jsx(X, { className: "w-5 h-5" }),
                }),
                _jsx("div", {
                  className: "p-6 border-b border-white/10",
                  children: _jsxs("div", {
                    className: "flex flex-col items-center gap-3",
                    children: [
                      _jsx("img", {
                        src: data.user.avatar,
                        className:
                          "w-20 h-20 rounded-full ring-4 ring-purple-500/50 object-cover",
                        alt: "avatar",
                      }),
                      _jsx("h2", {
                        className: "text-xl font-bold",
                        children: data.user.username,
                      }),
                      _jsx("p", {
                        className: "text-sm text-gray-400",
                        children: data.user.email,
                      }),
                    ],
                  }),
                }),
                _jsxs("div", {
                  className: "p-6 border-b border-white/10",
                  children: [
                    _jsx("div", {
                      className: "mb-4",
                      children: _jsx("span", {
                        className: "text-sm text-gray-400",
                        children: "Current Plan",
                      }),
                    }),
                    _jsxs("div", {
                      className: `${getPlanColor(data.plan)} rounded-xl p-4 flex items-center justify-between`,
                      children: [
                        _jsxs("div", {
                          className: "flex items-center gap-3",
                          children: [
                            getPlanIcon(data.plan),
                            _jsx("span", {
                              className: "text-xl font-bold",
                              children: getPlanName(data.plan),
                            }),
                          ],
                        }),
                        data.plan === "free" &&
                          _jsx(Link, {
                            href: "/pricing",
                            className:
                              "bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors",
                            children: "Upgrade",
                          }),
                      ],
                    }),
                  ],
                }),
                _jsxs("div", {
                  className: "p-6",
                  children: [
                    _jsx("h3", {
                      className: "text-lg font-semibold mb-4",
                      children: "Usage & Limits",
                    }),
                    _jsxs("div", {
                      className: "space-y-4",
                      children: [
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Repository Scans",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.repo_scan.used,
                                    " / ",
                                    formatLimit(data.limits.repo_scan.limit),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.repo_scan.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.repo_scan.used, data.limits.repo_scan.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Profile Scans",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.profile_scan.used,
                                    " / ",
                                    formatLimit(data.limits.profile_scan.limit),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.profile_scan.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.profile_scan.used, data.limits.profile_scan.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "README Generations",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.readme_generation.used,
                                    " /",
                                    " ",
                                    formatLimit(
                                      data.limits.readme_generation.limit,
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.readme_generation.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.readme_generation.used, data.limits.readme_generation.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "ESLint Analyses",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.eslint_analysis.used,
                                    " /",
                                    " ",
                                    formatLimit(
                                      data.limits.eslint_analysis.limit,
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.eslint_analysis.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.eslint_analysis.used, data.limits.eslint_analysis.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Code Smell Scans",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.code_smell_scan.used,
                                    " / ",
                                    formatLimit(
                                      data.limits.code_smell_scan.limit,
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.code_smell_scan.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.code_smell_scan.used, data.limits.code_smell_scan.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Bug Detection Runs",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.bug_detection_usage.used,
                                    " / ",
                                    formatLimit(
                                      data.limits.bug_detection_usage.limit,
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.bug_detection_usage.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.bug_detection_usage.used, data.limits.bug_detection_usage.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                        _jsxs("div", {
                          children: [
                            _jsxs("div", {
                              className: "flex justify-between text-sm mb-2",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Security Scans",
                                }),
                                _jsxs("span", {
                                  className: "text-white font-semibold",
                                  children: [
                                    data.limits.security_scan_usage.used,
                                    " / ",
                                    formatLimit(
                                      data.limits.security_scan_usage.limit,
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            data.limits.security_scan_usage.limit !== -1 &&
                              _jsx("div", {
                                className:
                                  "h-2 rounded-full bg-white/10 overflow-hidden",
                                children: _jsx("div", {
                                  className:
                                    "h-full bg-purple-500 transition-all",
                                  style: {
                                    width: `${getUsagePercentage(data.limits.security_scan_usage.used, data.limits.security_scan_usage.limit)}%`,
                                  },
                                }),
                              }),
                          ],
                        }),
                      ],
                    }),
                    _jsxs("div", {
                      className: "mt-6 pt-4 border-t border-white/20",
                      children: [
                        _jsx("h4", {
                          className: "text-sm font-semibold mb-3 text-gray-300",
                          children: "Features",
                        }),
                        _jsxs("div", {
                          className: "space-y-2 text-sm",
                          children: [
                            _jsxs("div", {
                              className: "flex items-center justify-between",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Bug Detection",
                                }),
                                _jsx("span", {
                                  className: data.limits.bug_detection
                                    ? "text-green-400"
                                    : "text-red-400",
                                  children: data.limits.bug_detection
                                    ? "✓ Enabled"
                                    : "✗ Locked",
                                }),
                              ],
                            }),
                            _jsxs("div", {
                              className: "flex items-center justify-between",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Security Scanning",
                                }),
                                _jsx("span", {
                                  className: data.limits.security_scan
                                    ? "text-green-400"
                                    : "text-red-400",
                                  children: data.limits.security_scan
                                    ? "✓ Enabled"
                                    : "✗ Locked",
                                }),
                              ],
                            }),
                            _jsxs("div", {
                              className: "flex items-center justify-between",
                              children: [
                                _jsx("span", {
                                  className: "text-gray-300",
                                  children: "Auto-Publish PRs",
                                }),
                                _jsx("span", {
                                  className: data.limits.pr_publish
                                    ? "text-green-400"
                                    : "text-red-400",
                                  children: data.limits.pr_publish
                                    ? "✓ Enabled"
                                    : "✗ Locked",
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    data.resetInHours > 0 &&
                      _jsx("div", {
                        className:
                          "mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg",
                        children: _jsxs("p", {
                          className: "text-xs text-blue-300",
                          children: [
                            "Usage resets in ",
                            data.resetInHours,
                            " hours",
                          ],
                        }),
                      }),
                    _jsxs("button", {
                      onClick: handleLogout,
                      className:
                        "mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-semibold transition-all",
                      children: [
                        _jsx(LogOut, { className: "w-4 h-4" }),
                        "Sign Out",
                      ],
                    }),
                  ],
                }),
              ],
            }),
      }),
    ],
  });
}
