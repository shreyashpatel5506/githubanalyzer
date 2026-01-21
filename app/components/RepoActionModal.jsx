"use client";

import { useRouter } from "next/navigation";
import { X, Github, Brain } from "lucide-react";

const RepoActionModal = ({ open, onClose, owner, repo }) => {
  const router = useRouter();

  if (!open) return null;

  const goToRepo = () => {
    onClose();
    router.push(`/repo/${owner}/${repo}`);
  };

  const goToAI = () => {
    onClose();
    router.push(`/repo/${owner}/${repo}/ai`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X />
        </button>

        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          What do you want to do?
        </h2>

        <div className="space-y-4">
          <button
            onClick={goToRepo}
            className="w-full flex items-center gap-3 px-4 py-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Github className="w-5 h-5" />
            View GitHub Repository
          </button>

          <button
            onClick={goToAI}
            className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Brain className="w-5 h-5" />
            Deep Analysis
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Free users: 5 AI analyses/day
        </p>
      </div>
    </div>



  );
};

export default RepoActionModal;
