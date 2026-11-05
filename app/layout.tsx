import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FamilyHeader } from "@/components/ui/family-header";
import { SiteFooter } from "@/components/site-footer";
import { FAMILY } from "@/lib/family";
import { themeInitScript } from "@/lib/theme";
import {
  snapshot,
  heroStages,
  formatNumber,
} from "@/data/snapshot";

/*
  Site metadata, derived at build time from the committed snapshot, so
  the numbers in the meta tags can never go stale between monthly
  rebuilds. The title names the product; the description is framed on
  the hero question and carries the funnel's first and last stages,
  formatted exactly as the page renders them.
*/
const SITE_TITLE = `${FAMILY.productName} | ${FAMILY.organization}`;
const SITE_DESCRIPTION = `Who ends up in a Dutch courtroom, and what happens to them? From ${formatNumber(
  heroStages[0].value,
)} registered crimes in ${heroStages[0].year} to ${formatNumber(
  heroStages[3].value,
)} prison sentences in ${heroStages[3].year}: open data from CBS StatLine, Eurostat and DJI, rendered straight into this page.`;

const OG_IMAGE_ALT = `The ${FAMILY.productName} in the Pixelate family's display style: the product name, its question, and the open-data credits.`;

export const metadata: Metadata = {
  metadataBase: new URL(FAMILY.siteUrl),
  title: {
    default: SITE_TITLE,
    template: `%s | ${FAMILY.productName}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Dutch criminal justice",
    "Netherlands courts",
    "CBS StatLine",
    "Eurostat",
    "open data",
    "crime statistics",
    "prison statistics",
  ],
  authors: [{ name: FAMILY.organization, url: FAMILY.organizationUrl }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: FAMILY.siteName,
    url: "/",
    locale: "en",
    images: [
      {
        url: "/images/og.png",
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/images/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/*
  Structured data: one Dataset node for the aggregates behind the page
  (CC-BY 4.0 license, Pixelate BV creator, dateModified from the
  snapshot) and a minimal WebSite node.
*/
const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Dutch criminal justice aggregates from CBS StatLine, Eurostat and DJI open data",
  description: SITE_DESCRIPTION,
  url: FAMILY.siteUrl,
  isAccessibleForFree: true,
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: {
    "@type": "Organization",
    name: FAMILY.organization,
    url: FAMILY.organizationUrl,
  },
  provider: {
    "@type": "Organization",
    name: "CBS StatLine, Eurostat and Dienst Justitiële Inrichtingen (DJI)",
    url: "https://statline.cbs.nl",
  },
  sameAs: FAMILY.sourceUrl,
  dateModified: snapshot.retrievedAt,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: FAMILY.productName,
  url: FAMILY.siteUrl,
};

/*
  Theme colors mirror the --background tokens in globals.css:
  #eaf6f9 for light, #0f353d for dark.
*/
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f353d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <FamilyHeader productName={FAMILY.productName} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
