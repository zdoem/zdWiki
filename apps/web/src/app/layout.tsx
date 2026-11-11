import "./globals.css";
import { Orbitron, Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "zdWiki v1 — Engineering Memory & Console",
  description: "High-performance Local-first Engineering Knowledge Operating System with Version-Aware Memory & Verified Loops.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-canvas text-textMain antialiased font-sans selection:bg-brass selection:text-canvas">
        {children}
      </body>
    </html>
  );
}
