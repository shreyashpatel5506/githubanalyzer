import { Roboto } from 'next/font/google';
import "./globals.css";
import Navbar from "./components/Navbar.js";

const roboto = Roboto({
  weight: ['400', '700'],        // 400 for regular, 700 for bold
  subsets: ['latin'],            // 'latin' is standard
  display: 'swap',               // Recommended for performance
});

// METADATA API (Next.js 13+)
export const metadata = {
  title: "GitProfileAi - AI GitHub Profile Analyzer",
  description: "AI-powered GitHub profile analyzer with tech stack insights, project health scoring, and PDF export features.",
  keywords: ["GitHub", "AI", "Analyzer", "Profile", "Repository", "Tech Stack", "Developer Tools"],
  authors: [{ name: "gitprofileAi Team" }],
  
  // Open Graph
  openGraph: {
    title: "GitProfileAi - AI GitHub Profile Analyzer",
    description: "Analyze any GitHub profile with AI. Get tech stack insights and project health scores.",
    url: "https://gitprofileai.vercel.app",
    siteName: "GitProfileAi",
    type: "website",
  },
  
  // Twitter Cards
  twitter: {
    card: "summary_large_image",
    title: "GitProfileAi - AI GitHub Profile Analyzer",
    description: "AI-powered GitHub profile analyzer",
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
    <html lang="en">
      <body
        className={`${roboto.className} antialiased md:ml-56 pt-14 md:pt-0`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}