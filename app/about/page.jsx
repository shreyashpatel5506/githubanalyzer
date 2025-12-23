"use client";

import React from "react";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">

        {/* ================= HEADER ================= */}
        <div className="mb-14">
          <h1 className="text-4xl font-extrabold text-indigo-300 tracking-tight">
            About
          </h1>
          <p className="text-slate-400 mt-3 text-lg leading-relaxed">
            Learn more about this platform, its purpose, and how it helps developers
            analyze and showcase their GitHub presence.
          </p>
        </div>

        {/* ================= CARD ================= */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8 md:p-10 space-y-10">

          {/* SECTION 1 */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-300 mb-3">
              🚀 What is this?
            </h2>
            <p className="text-slate-400 leading-relaxed">
              This platform analyzes your GitHub profile and repositories to give
              you a clean, structured, and professional overview of your work.
              It highlights your projects, tech stack, activity, and growth —
              all in one place.
            </p>
          </section>

          {/* SECTION 2 */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-300 mb-3">
              🎯 Why it exists
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Recruiters and collaborators don’t have time to dig through raw
              GitHub data. This tool transforms your GitHub into a
              portfolio-style experience that is easy to scan, understand,
              and trust.
            </p>
          </section>

          {/* SECTION 3 */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-300 mb-3">
              🧠 What it analyzes
            </h2>
            <ul className="space-y-3 text-slate-400 list-disc list-inside">
              <li>Public repositories and project quality</li>
              <li>Languages and technology usage</li>
              <li>Stars, forks, and recent activity</li>
              <li>Consistency and contribution patterns</li>
              <li>Documentation and open-source readiness</li>
            </ul>
          </section>

          {/* SECTION 4 */}
          <section>
            <h2 className="text-2xl font-bold text-indigo-300 mb-3">
              🛠 Built with
            </h2>
            <div className="flex flex-wrap gap-3">
              {[
                "Next.js",
                "React",
                "Tailwind CSS",
                "GitHub API",
                "OpenAI",
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-1.5 rounded-xl text-sm font-semibold
                             bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {/* SECTION 5 */}
          <section className="pt-6 border-t border-slate-700">
            <h2 className="text-xl font-bold text-indigo-300 mb-2">
              👋 Final note
            </h2>
            <p className="text-slate-400 leading-relaxed">
              This project is designed for developers who want their GitHub
              to speak clearly and confidently. Whether you’re applying for jobs,
              contributing to open source, or building in public — this helps
              you stand out.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
