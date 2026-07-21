import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan History",
  description: "Private scan history for your ClarityCode account.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
