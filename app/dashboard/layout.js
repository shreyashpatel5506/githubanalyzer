export const metadata = {
    title: "Dashboard",
    description: "Your personalized ClarityCode dashboard.",
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-snippet": 0,
            "max-image-preview": "none",
            "max-video-preview": 0,
        },
    },
};
export default function DashboardLayout({ children }) {
    return children;
}
