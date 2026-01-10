"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ArrowRight, Sparkles, Github } from "lucide-react";

export default function SearchBar({ onSearch, loading = false }) {
  const [username, setUsername] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() && !loading) {
      onSearch(username.trim());
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Auto-focus on mount for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Search Container */}
      <form onSubmit={handleSubmit} className="relative group">
        <div 
          className={`
            relative overflow-hidden rounded-2xl transition-all duration-500 ease-out
            ${isFocused || isHovered 
              ? 'shadow-2xl shadow-emerald-500/25 scale-[1.02]' 
              : 'shadow-xl shadow-black/10'
            }
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Animated Background Gradient */}
          <div className={`
            absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-blue-500/20 to-purple-500/20
            transition-opacity duration-500 ease-out
            ${isFocused ? 'opacity-100' : 'opacity-0'}
          `} />
          
          {/* Glassmorphism Background */}
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl" />
          
          {/* Animated Border */}
          <div className={`
            absolute inset-0 rounded-2xl transition-all duration-500 ease-out
            ${isFocused 
              ? 'bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 p-[2px]' 
              : 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 p-[1px]'
            }
          `}>
            <div className="h-full w-full rounded-2xl bg-white dark:bg-gray-900" />
          </div>

          {/* Content Container */}
          <div className="relative flex items-center">
            {/* Search Icon with Animation */}
            <div className="absolute left-6 z-10">
              <div className={`
                transition-all duration-300 ease-out
                ${isFocused ? 'scale-110 rotate-12' : 'scale-100 rotate-0'}
              `}>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className={`
                    w-5 h-5 transition-colors duration-300
                    ${isFocused ? 'text-emerald-500' : 'text-gray-400'}
                  `} />
                )}
              </div>
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Enter GitHub username..."
              disabled={loading}
              className={`
                w-full h-16 pl-16 pr-32 text-lg font-medium bg-transparent
                text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400
                focus:outline-none transition-all duration-300 ease-out
                ${isFocused ? 'placeholder:translate-x-2' : 'placeholder:translate-x-0'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              autoComplete="off"
              spellCheck="false"
            />

            {/* Animated Submit Button */}
            <button
              type="submit"
              disabled={!username.trim() || loading}
              className={`
                absolute right-2 h-12 px-6 rounded-xl font-semibold text-white
                transition-all duration-300 ease-out transform
                disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                ${username.trim() && !loading
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 scale-100 hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-400 scale-95'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Analyze</span>
                    <ArrowRight className={`
                      w-4 h-4 transition-transform duration-300
                      ${username.trim() ? 'translate-x-0' : '-translate-x-1'}
                    `} />
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Floating Particles Animation */}
          {isFocused && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              <div className="absolute top-4 left-8 w-1 h-1 bg-emerald-400 rounded-full animate-ping" 
                   style={{ animationDelay: '0s', animationDuration: '2s' }} />
              <div className="absolute top-8 right-12 w-1 h-1 bg-blue-400 rounded-full animate-ping" 
                   style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
              <div className="absolute bottom-6 left-16 w-1 h-1 bg-purple-400 rounded-full animate-ping" 
                   style={{ animationDelay: '1s', animationDuration: '2s' }} />
              <div className="absolute bottom-4 right-20 w-1 h-1 bg-emerald-400 rounded-full animate-ping" 
                   style={{ animationDelay: '1.5s', animationDuration: '2s' }} />
            </div>
          )}
        </div>
      </form>
      
      {/* Subtitle with Animation */}
      <div className={`
        mt-6 text-center transition-all duration-500 ease-out
        ${isFocused ? 'transform translate-y-2 opacity-100' : 'transform translate-y-0 opacity-70'}
      `}>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          Get AI-powered insights into GitHub profiles and coding skills
        </p>
        
        {/* Popular Examples */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-xs text-gray-500 dark:text-gray-500">Try:</span>
          {['shreyashpatel5506', 'gaearon', 'sindresorhus'].map((example, index) => (
            <button
              key={example}
              onClick={() => {
                setUsername(example);
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              className={`
                text-xs px-3 py-1 rounded-full border transition-all duration-300
                hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600
                border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400
                hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-105
              `}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Github className="w-3 h-3 inline mr-1" />
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      {isFocused && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 
                       animate-fade-in opacity-0 animate-delay-300 animate-fill-forwards">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 
                         rounded-lg text-xs text-gray-600 dark:text-gray-400">
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd>
            <span>to analyze</span>
          </div>
        </div>
      )}
    </div>
  );
}
