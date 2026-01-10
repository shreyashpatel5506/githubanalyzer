"use client";

import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { Sparkles, Target, Brain, Wrench, Heart, Github, Star } from "lucide-react";

const AboutPage = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced algorithms evaluate coding patterns, project quality, and technical expertise"
    },
    {
      icon: Target,
      title: "Recruiter-Ready Reports",
      description: "Professional insights formatted for hiring managers and technical recruiters"
    },
    {
      icon: Sparkles,
      title: "Instant Insights",
      description: "Get comprehensive analysis in seconds with actionable improvement recommendations"
    }
  ];

  const technologies = [
    "Next.js", "React", "Tailwind CSS", "GitHub API", "OpenAI", "TypeScript"
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            About GitProfile AI
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Learn how we help developers analyze and showcase their GitHub presence 
            with AI-powered insights and professional reporting.
          </p>
        </div>

        {/* What is this */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              What is GitProfile AI?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              GitProfile AI analyzes your GitHub profile and repositories to provide a clean, 
              structured, and professional overview of your development work. It highlights 
              your projects, technical skills, activity patterns, and growth trajectory — 
              all presented in a format that recruiters and collaborators can easily understand.
            </p>
          </CardContent>
        </Card>

        {/* Why it exists */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              Why we built this
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Recruiters and technical collaborators don't have time to dig through raw GitHub data. 
              This tool transforms your GitHub presence into a portfolio-style experience that's 
              easy to scan, understand, and trust. It bridges the gap between your technical work 
              and professional presentation.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} hover>
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl">
                    <feature.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What we analyze */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
              What we analyze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Public repositories and project quality
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Programming languages and technology usage
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Stars, forks, and community engagement
                </li>
              </ul>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Consistency and contribution patterns
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Documentation and code quality
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Open-source readiness and collaboration
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Built with */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Wrench className="w-5 h-5 text-orange-600" />
              </div>
              Built with modern technology
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 
                           rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open Source */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              Open Source & Community
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              GitProfile AI is built for developers who want their GitHub presence to communicate 
              clearly and confidently. Whether you're applying for jobs, contributing to open source, 
              or building in public — this tool helps you stand out in the best way possible.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://github.com/shreyashpatel5506/gitprofileAi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white 
                         text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 
                         transition-colors font-medium"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
              
              <a
                href="https://github.com/shreyashpatel5506/gitprofileAi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 
                         text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                <Star className="w-5 h-5" />
                Star the Repository
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Final note */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Built with care for the developer community. We believe every developer deserves 
            tools that help them showcase their best work and grow their careers.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;