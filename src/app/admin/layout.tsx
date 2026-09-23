import type { Metadata } from "next";

// admin tools — keep out of search results
export const metadata: Metadata = {
  title: "merrbakes admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
