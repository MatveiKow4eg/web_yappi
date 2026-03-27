import type { Metadata } from "next";
import { Noto_Serif } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto",
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
    <html lang="ru" className={notoSerif.variable}>
      <body className="bg-brand-black text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
