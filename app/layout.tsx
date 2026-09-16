import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteBottomNav } from "@/components/site-bottom-nav";
import { PageTransition } from "@/components/page-transition";
import { OverlayScrollbar } from "@/components/overlay-scrollbar";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

const sans = Noto_Sans_KR({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "healthcare",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google: "eQX-mYKL7NbRiG-_s3jBOZlxHkFjDkpN9v-Y_Yot258",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "ko",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sans.variable} bg-paper h-full overflow-hidden antialiased`}>
      <body className="bg-paper text-ink h-full overflow-hidden font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="app-frame">
          <SiteHeader />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-[var(--liquid-tabbar-space)] sm:max-w-5xl sm:py-8 md:pb-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <SiteBottomNav />
        <OverlayScrollbar />
      </body>
    </html>
  );
}
