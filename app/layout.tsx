import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humora AI — Biznes Maslahatchi",
  description:
    "O'zbekistonda biznes boshlash va rivojlantirish uchun AI maslahatchi. 1.6 mln kompaniya ma'lumotlari asosida.",
  keywords: ["biznes maslahat", "uzbekistan business", "SMB advisor", "humora"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
