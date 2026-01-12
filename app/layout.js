import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// METADATA API (Next.js 13+)
export const metadata = {
  title: "GitProfile AI - AI-Powered GitHub Profile Analysis",
  description:
    "Get comprehensive AI analysis of GitHub profiles with recruiter-grade insights, skill assessments, and improvement recommendations.",
  keywords: [
    "GitHub",
    "AI",
    "Profile Analysis",
    "Developer Assessment",
    "Coding Skills",
    "Recruiter Tools",
    "Tech Hiring",
  ],
  authors: [{ name: "GitProfile AI Team" }],

  // Open Graph
  openGraph: {
    title: "GitProfile AI - AI-Powered GitHub Profile Analysis",
    description:
      "Analyze any GitHub profile with AI. Get recruiter-grade insights and skill assessments.",
    url: "https://gitprofileai.vercel.app",
    siteName: "GitProfile AI",
    type: "website",
  },

  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "GitProfile AI - AI-Powered GitHub Profile Analysis",
    description: "Get comprehensive AI analysis of GitHub profiles",
  },

  // Robots (SEO)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
