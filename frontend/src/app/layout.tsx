import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
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
    <html lang="ru" className={manrope.variable}>
      <body className="bg-brand-black text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
