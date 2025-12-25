"use client";

import React from "react";
import { Github, Mail, Globe } from "lucide-react";

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-20">
      <div className="max-w-4xl mx-auto">

        {/* 🔹 HEADER */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold mb-4">
            Contact & Open Source
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Interested in collaboration, open-source contributions, or feedback?
            I’d love to connect.
          </p>
        </div>

        {/* 🔹 CONTENT */}
        <div className="grid md:grid-cols-2 gap-10">

          {/* 📌 LEFT */}
          <section className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">
              Open Source Contributions
            </h2>

            <p className="text-gray-300 mb-6 leading-relaxed">
              I actively build and maintain open-source projects with a focus on
              developer tooling, GitHub analytics, and AI-powered insights.
              Contributions, issues, and pull requests are always welcome.
            </p>

            <div className="space-y-4">
              <a
                href="https://github.com/shreyashpatel5506/gitprofileAi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 transition px-5 py-3 rounded-xl font-semibold"
              >
                <Github size={20} />
                GitProfile AI Repository
              </a>

              <p className="text-sm text-gray-400">
                ⭐ Star the repo if you find it useful
              </p>
            </div>
          </section>

          {/* 📬 RIGHT */}
          <section className="bg-gray-900 rounded-3xl p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">
              Get in Touch
            </h2>

            <p className="text-gray-300 mb-6 leading-relaxed">
              Whether you're a recruiter, developer, or open-source enthusiast,
              feel free to reach out for collaboration or feedback.
            </p>

            <div className="space-y-5">

              <div className="flex items-center gap-4">
                <Mail className="text-indigo-400" />
                <span className="text-gray-300">
                  Available via GitHub Discussions / Issues
                </span>
              </div>

              <div className="flex items-center gap-4">
                <Globe className="text-indigo-400" />
                <a
                  href="https://github.com/shreyashpatel5506"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  github.com/shreyashpatel5506
                </a>
              </div>

            </div>
          </section>

        </div>

        {/* 🔻 FOOTER */}
        <div className="mt-20 text-center text-gray-500 text-sm">
          Built with ❤️ for the open-source community
        </div>

      </div>
    </div>
  );
};

export default ContactPage;
