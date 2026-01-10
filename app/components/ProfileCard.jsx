"use client";

import { Card, CardContent } from "./Card";
import { MapPin, Link as LinkIcon, Calendar, Users, BookOpen, Share2 } from "lucide-react";

export default function ProfileCard({ profile, onShare }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative h-24 bg-gradient-to-r from-emerald-400 to-blue-500"></div>
      
      <CardContent className="relative pt-0">
        {/* Avatar */}
        <div className="flex justify-between items-start -mt-12 mb-4">
          <img
            src={profile.avatarUrl}
            alt={profile.name || profile.username}
            className="w-24 h-24 rounded-xl border-4 border-white dark:border-gray-800 shadow-lg"
          />
          
          <button
            onClick={onShare}
            className="mt-12 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.name || profile.username}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">@{profile.username}</p>
          </div>

          {profile.bio && (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                  href={profile.blog} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  Website
                </a>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {profile.followers?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {profile.following?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {profile.publicRepos?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Repos</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}