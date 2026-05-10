"use client";

import { Card, CardContent } from "./Card";
import { MapPin, Link as LinkIcon, Calendar, Share2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSessionAuth } from "@/app/lib/use-session-auth";

interface Profile {
    name?: string;
    username: string;
    avatarUrl: string;
    bio?: string;
    createdAt: string;
    location?: string;
    blog?: string;
    followers: number;
    following: number;
    publicRepos: number;
}

interface ProfileCardProps {
    profile: Profile;
    onShare?: () => void;
}

export default function ProfileCard({ profile, onShare }: ProfileCardProps) {
    const router = useRouter();
    const { isSignedIn } = useSessionAuth();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
        });
    };

    const handleLogout = async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        router.push("/");
        window.location.href = "/";
    };

    return (
        <Card className="overflow-hidden border-none bg-linear-to-br from-slate-900 via-slate-950 to-indigo-950 text-white shadow-2xl shadow-indigo-950/20">
            <div className="relative h-28 bg-linear-to-r from-emerald-500 via-cyan-500 to-blue-600" />

            <CardContent className="relative pt-0">
                {/* Avatar */}
                <div className="flex justify-between items-start -mt-12 mb-4">
                    <img
                        src={profile.avatarUrl}
                        alt={profile.name || profile.username}
                        className="w-24 h-24 rounded-2xl border-4 border-slate-950 shadow-xl object-cover"
                    />

                    <div className="mt-12 flex items-center gap-2">
                        {onShare && (
                            <button
                                onClick={onShare}
                                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        )}
                        {isSignedIn && (
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm font-semibold">Logout</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Profile Info */}
                <div className="space-y-3">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {profile.name || profile.username || "Anonymous"}
                        </h1>
                        <p className="text-slate-300">@{profile.username}</p>
                    </div>

                    {profile.bio && (
                        <p className="text-slate-200 leading-relaxed">
                            {profile.bio}
                        </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {formatDate(profile.createdAt)}</span>
                        </div>

                        {profile.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{profile.location}</span>
                            </div>
                        )}

                        {profile.blog && (
                            <div className="flex items-center gap-1">
                                <LinkIcon className="w-4 h-4" />
                                <a
                                    href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-300 hover:text-emerald-200"
                                >
                                    Website
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 pt-4 border-t border-white/10">
                        <div className="text-center">
                            <div className="text-xl font-bold text-white">
                                {profile.followers?.toLocaleString() || 0}
                            </div>
                            <div className="text-sm text-slate-300">Followers</div>
                        </div>

                        <div className="text-center">
                            <div className="text-xl font-bold text-white">
                                {profile.following?.toLocaleString() || 0}
                            </div>
                            <div className="text-sm text-slate-300">Following</div>
                        </div>

                        <div className="text-center">
                            <div className="text-xl font-bold text-white">
                                {profile.publicRepos?.toLocaleString() || 0}
                            </div>
                            <div className="text-sm text-slate-300">Repos</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
