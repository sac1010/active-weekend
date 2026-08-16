import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ToastProvider } from "@/lib/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ActiveWeekend Bangalore | Sports & Hobby Squad Matchmaking",
  description: "Join premium local sports, fitness, and hobby squads in HSR Layout, Indiranagar, and Koramangala. Meet sports partners, split court fees, and play this weekend.",
  keywords: ["badminton partners Bangalore", "pickleball partners Bangalore", "board games Bangalore", "trekking groups Bangalore", "active weekend Bangalore"],
  openGraph: {
    title: "ActiveWeekend Bangalore",
    description: "Join local sports, fitness, and hobby squads in Bangalore.",
    type: "website"
  }
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090d16] text-[#f8fafc]">
        <ToastProvider>
          <Header />
          <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-6 md:px-8">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
