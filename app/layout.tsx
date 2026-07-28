import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Merriweather } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-clue",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jeopardy Live",
  description: "The live quiz game."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-white">{children}</body>
    </html>
  );
}
