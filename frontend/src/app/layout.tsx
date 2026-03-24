import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Yappi Sushi — Доставка роллов и суши",
    template: "%s | Yappi Sushi",
  },
  description:
    "Свежие роллы, суши и сеты с доставкой и самовывозом. Японская кухня с любовью.",
  keywords: ["суши", "роллы", "доставка суши", "yappi sushi"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="bg-brand-black text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
