import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Админка | Yappi Sushi",
    template: "%s | Admin",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-brand-black">{children}</div>;
}
