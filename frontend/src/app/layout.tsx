import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
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
    <html lang="ru" className={playfair.variable}>
      <body className="bg-brand-black text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
