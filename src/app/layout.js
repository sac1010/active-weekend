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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://activeweekend.fun';

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'ActiveWeekend — Find Local Events, Sports & Meetups in Bangalore',
    template: '%s | ActiveWeekend Bangalore'
  },
  description: 'Discover and join free local meetups, sports squads, group rides, trekking expeditions, and social hangouts in Bangalore. 100% free, community-driven, moderated by TrustPoints.',
  keywords: [
    'Bangalore meetups', 'Bangalore events', 'weekend activities Bangalore',
    'sports groups Bangalore', 'badminton groups Bangalore', 'cycling clubs Bangalore',
    'trekking groups near Bangalore', 'board games Bangalore', 'pub crawl Bangalore',
    'cricket groups Bangalore', 'football groups Bangalore', 'running clubs Bangalore',
    'HSR Layout events', 'Koramangala meetups', 'Indiranagar events',
    'Whitefield meetups', 'Bellandur activities', 'BTM Layout meetups',
    'free events Bangalore', 'community events Bangalore', 'namma Bangalore weekend',
    'social meetups Bangalore', 'active weekend Bangalore'
  ],
  alternates: {
    canonical: baseUrl
  },
  openGraph: {
    title: 'ActiveWeekend — Free Local Events, Sports & Meetups in Bangalore',
    description: 'Find free local squads, sports partners, group rides, and social meetups in Bangalore. 100% free, community-driven.',
    url: baseUrl,
    siteName: 'ActiveWeekend',
    locale: 'en_IN',
    type: 'website',
    images: [{
      url: `${baseUrl}/og-image.png`,
      width: 1200,
      height: 630,
      alt: 'ActiveWeekend — Bangalore Meetups & Events'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ActiveWeekend — Free Local Events & Meetups in Bangalore',
    description: 'Join free local sports, group rides, and social hangouts in Bangalore. Connect. Play. Explore.',
    images: [`${baseUrl}/og-image.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function RootLayout({ children }) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ActiveWeekend",
    "url": baseUrl,
    "description": "Free local events, sports meetups, and group activities platform for Bangalore.",
    "areaServed": {
      "@type": "City",
      "name": "Bangalore",
      "sameAs": "https://en.wikipedia.org/wiki/Bangalore"
    },
    "sameAs": [baseUrl]
  };

  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090d16] text-[#f8fafc]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
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
