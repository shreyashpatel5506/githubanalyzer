import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteUrl, defaultSeoKeywords } from "@/app/lib/seo";
import './globals.css';
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
export const metadata = {
    metadataBase: new URL(getSiteUrl()),
    title: {
        default: "ClarityCode | AI GitHub Profile & Repository Analysis",
        template: "%s | ClarityCode",
    },
    description: "Analyze GitHub profiles and repositories with AI to detect bugs, security issues, and code smells with actionable improvement recommendations.",
    keywords: defaultSeoKeywords,
    authors: [{ name: "ClarityCode Team" }],
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "ClarityCode | AI GitHub Profile & Repository Analysis",
        description: "Analyze GitHub profiles and repositories with AI. Detect code smells, bugs, and security risks with recruiter-grade insights.",
        url: "/",
        siteName: "ClarityCode",
        type: "website",
        locale: "en_US",
    },
    twitter: {
        card: "summary_large_image",
        title: "ClarityCode | AI GitHub Profile & Repository Analysis",
        description: "Analyze repositories and GitHub profiles with actionable AI insights.",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
    verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    },
};
export default function RootLayout({ children, }) {
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-TS2NRZQF3M";
    const adsenseClient = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
    const siteUrl = getSiteUrl();
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "ClarityCode",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
    };
    const webSiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ClarityCode",
        url: siteUrl,
        potentialAction: {
            "@type": "SearchAction",
            target: `${siteUrl}/?user={search_term_string}`,
            "query-input": "required name=search_term_string",
        },
    };
    return (_jsxs("html", { lang: "en", children: [_jsxs("head", { children: [_jsx(Script, { id: "gtag-src", src: `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`, strategy: "beforeInteractive" }), _jsx(Script, { id: "google-analytics", strategy: "beforeInteractive", dangerouslySetInnerHTML: {
                            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaMeasurementId}');`,
                        } }), _jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: JSON.stringify(organizationSchema) } }), _jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: JSON.stringify(webSiteSchema) } }), adsenseClient && (_jsx(Script, { id: "google-adsense", async: true, strategy: "afterInteractive", src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`, crossOrigin: "anonymous" }))] }), _jsxs("body", { className: `${geistSans.variable} ${geistMono.variable} antialiased`, children: [children, _jsx(Analytics, {}), _jsx(SpeedInsights, {})] })] }));
}
