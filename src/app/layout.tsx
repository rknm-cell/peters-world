import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { ReactScanProvider } from "~/components/ReactScanProvider";

export const metadata: Metadata = {
  title: "Peter's World - Make it your own",
  description:
    "Build a world with my interactive 3D world builder. Create, explore, and share your own tiny worlds with beautiful 3D graphics and immersive experiences.",
  keywords: ["3D world builder", "interactive", "creative", "gaming", "3D graphics", "world creation"],
  authors: [{ name: "Peter Yelton" }],
  creator: "Peter Yelton",
  publisher: "Peter's World",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://peters-world.com", // Update this with your actual domain
    siteName: "Peter's World",
    title: "Peter's World - Interactive 3D World Builder",
    description: "Create, explore, and share your own tiny worlds with beautiful 3D graphics and immersive experiences.",
    images: [
      {
        url: "/globe.png",
        width: 512,
        height: 512,
        alt: "Peter's World - 3D World Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peter's World - Interactive 3D World Builder",
    description: "Create, explore, and share your own tiny worlds with beautiful 3D graphics and immersive experiences.",
    images: ["/globe.png"],
    creator: "@racknahm", // Update this with your actual Twitter handle
  },
  icons: [{ rel: "icon", url: "/globe.png" }],
  manifest: "/site.webmanifest",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#111827", // Matches your bg-gray-900
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Modak&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <TRPCReactProvider>
          {children}
          <ReactScanProvider />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
