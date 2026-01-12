"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/Card";
import { Search, Filter, Star, GitFork, ExternalLink, Calendar, Activity, AlertCircle } from "lucide-react";
import RepoActionModal from "../components/RepoActionModal";

const ProjectsPage = () => {
  const [data, setData] = useState(null);
  const [filteredRepos, setFilteredRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLang, setSelectedLang] = useState("All");
  const [sortBy, setSortBy] = useState("updated");
  const router = useRouter();

  /* Load data from localStorage */
  useEffect(() => {
    const savedData = localStorage.getItem("githubData");
    if (!savedData) {
      router.push("/");
      return;
    }

    try {
      const parsed = JSON.parse(savedData);
      setData(parsed);
      setFilteredRepos(parsed.repos || []);
    } catch (err) {
      console.error("Invalid localStorage data");
      router.push("/");
    }
  }, [router]);

  /* Filter and sort logic */
  useEffect(() => {
    if (!data) return;

    let filtered = data.repos.filter((repo) => {
      const matchesSearch = repo.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesLang = selectedLang === "All" || repo.language === selectedLang;

      return matchesSearch && matchesLang;
    });

    // Sort repositories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "stars":
          return b.stars - a.stars;
        case "forks":
          return b.forks - a.forks;
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
        default:
          return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
    });

    setFilteredRepos(filtered);
  }, [searchTerm, selectedLang, sortBy, data]);

  if (!data) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No GitHub data found. Please analyze a profile first.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const languages = [
    "All",
    ...new Set(data.repos.map((r) => r.language).filter(Boolean)),
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageColor = (language) => {
    const colors = {
      JavaScript: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      TypeScript: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      Python: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      Java: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      "C++": "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      Go: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400",
      Rust: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    };
    return colors[language] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Projects
            <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({data.repos.length} repositories)
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Browse and explore all public repositories from {data.profile.username}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                           placeholder:text-gray-500 focus:outline-none focus:ring-2 
                           focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Language Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 dark:border-gray-700 
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                           appearance-none cursor-pointer min-w-[140px]"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-200 dark:border-gray-700 
                         rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                         appearance-none cursor-pointer min-w-[120px]"
              >
                <option value="updated">Recently Updated</option>
                <option value="stars">Most Stars</option>
                <option value="forks">Most Forks</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Repository Grid */}
        {filteredRepos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepos.map((repo) => (
              <Card 
                key={repo.id} 
                hover 
                className="cursor-pointer group"
                onClick={() => setSelectedRepo(repo)}

              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 
                                 dark:group-hover:text-emerald-400 transition-colors truncate flex-1 mr-2">
                      {repo.name}
                    </h3>
                    
                    {repo.isActive && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 
                                    text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                        <Activity className="w-3 h-3" />
                        Active
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 min-h-[2.5rem]">
                    {repo.description || "No description provided"}
                  </p>

                  {/* Homepage Link */}
                  {repo.homepage && (
                    <a
                      href={repo.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 
                               hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mb-4"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Live Demo
                    </a>
                  )}

                  {/* Topics */}
                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {repo.topics.slice(0, 3).map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                                   rounded text-xs font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                      {repo.topics.length > 3 && (
                        <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                          +{repo.topics.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Language */}
                  {repo.language && (
                    <div className="mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLanguageColor(repo.language)}`}>
                        {repo.language}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        <span>{repo.stars}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitFork className="w-4 h-4" />
                        <span>{repo.forks}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(repo.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No repositories found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search terms or filters to find repositories.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      {selectedRepo && (
<RepoActionModal
  open={!!selectedRepo}
  onClose={() => setSelectedRepo(null)}
  owner={data.profile.username}
  repo={selectedRepo.name}
/>
)}
    </Layout>

  );
};

export default ProjectsPage;