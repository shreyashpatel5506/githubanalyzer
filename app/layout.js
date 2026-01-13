import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Script from "next/script";

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

  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({ children }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`, // Yahan variable use kiya
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`} // Yahan bhi variable
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
