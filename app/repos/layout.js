export const metadata = {
    title: "Repositories",
    description: "Private repository analysis workspace.",
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
export default function ReposLayout({ children }) {
    return children;
}
