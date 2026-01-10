"use client";

import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { Github, Mail, MessageCircle, Star, Heart, ExternalLink } from "lucide-react";

const ContactPage = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Contact & Open Source
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Interested in collaboration, open-source contributions, or feedback? 
            We'd love to connect with you.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Open Source Contributions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                  <Github className="w-5 h-5 text-emerald-600" />
                </div>
                Open Source Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                We actively build and maintain open-source projects focused on developer tooling, 
                GitHub analytics, and AI-powered insights. Contributions, issues, and pull requests 
                are always welcome.
              </p>

              <div className="space-y-4">
                <a
                  href="https://github.com/shreyashpatel5506/gitprofileAi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full px-6 py-4 bg-gray-900 dark:bg-white 
                           text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 
                           dark:hover:bg-gray-100 transition-colors font-medium group"
                >
                  <Github className="w-5 h-5" />
                  <span className="flex-1">GitProfile AI Repository</span>
                  <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                </a>

                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>Star the repository if you find it useful</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Get in Touch */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                Get in Touch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                Whether you're a recruiter, developer, or open-source enthusiast, 
                feel free to reach out for collaboration or feedback.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">GitHub Discussions</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Available via GitHub Issues & Discussions
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                    <Github className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">GitHub Profile</div>
                    <a 
                      href="https://github.com/shreyashpatel5506"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 
                               dark:hover:text-emerald-300 break-all"
                    >
                      github.com/shreyashpatel5506
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Community Guidelines */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Heart className="w-5 h-5 text-orange-600" />
              </div>
              Community Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  How to Contribute
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Fork the repository and create a feature branch
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Write clear, documented code with tests
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Submit a pull request with detailed description
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    Follow our code of conduct and style guide
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Ways to Help
                </h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Report bugs and suggest improvements
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Improve documentation and examples
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Add new features and enhancements
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Share the project with other developers
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl">
              <Heart className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Built with ❤️ for the Open Source Community
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
            GitProfile AI is a community-driven project. Every contribution, no matter how small, 
            helps make this tool better for developers worldwide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/shreyashpatel5506/gitprofileAi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 
                       text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Github className="w-5 h-5" />
              Contribute on GitHub
            </a>
            
            <a
              href="https://github.com/shreyashpatel5506/gitprofileAi/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-100 dark:bg-gray-800 
                       text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                       transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              Report Issues
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;