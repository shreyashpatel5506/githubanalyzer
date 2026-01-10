"use client";

import { useState } from "react";
import { Card, CardContent } from "./Card";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function ShareModal({ isOpen, onClose, profileUrl, username }) {
  const [copiedStates, setCopiedStates] = useState({});

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareOptions = [
    {
      key: 'profile',
      label: 'Copy Profile Link',
      description: 'Share the direct link to this analysis',
      url: profileUrl,
      icon: Copy,
      color: 'text-gray-600'
    },
    {
      key: 'linkedin',
      label: 'Share on LinkedIn',
      description: 'Post to your LinkedIn network',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      icon: ExternalLink,
      color: 'text-blue-600',
      external: true
    },
    {
      key: 'twitter',
      label: 'Share on X (Twitter)',
      description: 'Tweet about this profile analysis',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this GitHub profile analysis for @${username}`)}&url=${encodeURIComponent(profileUrl)}`,
      icon: ExternalLink,
      color: 'text-gray-900',
      external: true
    }
  ];

  const handleShare = (option) => {
    if (option.external) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    } else {
      copyToClipboard(option.url, option.key);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Share Profile Analysis
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                         p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {shareOptions.map((option) => {
                const Icon = option.icon;
                const isCopied = copiedStates[option.key];
                
                return (
                  <button
                    key={option.key}
                    onClick={() => handleShare(option)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 
                             dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 
                             transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${option.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {option.description}
                        </div>
                      </div>
                    </div>
                    
                    {!option.external && (
                      <div className="flex items-center">
                        {isCopied ? (
                          <div className="flex items-center space-x-1 text-emerald-600">
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">Copied!</span>
                          </div>
                        ) : (
                          <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                            <Copy className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {option.external && (
                      <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Profile URL
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={profileUrl}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 
                           dark:border-gray-600 rounded-lg text-gray-900 dark:text-white 
                           focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => copyToClipboard(profileUrl, 'url')}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 
                           hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {copiedStates.url ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}