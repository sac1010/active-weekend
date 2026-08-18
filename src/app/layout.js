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
  title: "ActiveWeekend Bangalore | Local Meetups, Sports, Rides & Socials",
  description: "Join premium local meetups, sports clubs, group rides, and social squads in Bangalore. Find play partners, coordinate cycling trips, or meet new people at local pubs and cafes.",
  keywords: ["Bangalore meetups", "weekend activities Bangalore", "sports groups Bangalore", "cycling clubs Bangalore", "pub crawls Bangalore", "board games meetups Bangalore", "active weekend Bangalore"],
  openGraph: {
    title: "ActiveWeekend Bangalore | Local Meetups, Sports & Socials",
    description: "Join premium local meetups, sports clubs, group rides, and social squads in Bangalore.",
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
