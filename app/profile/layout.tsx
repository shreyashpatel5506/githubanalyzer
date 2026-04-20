import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Private profile and plan usage details.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
