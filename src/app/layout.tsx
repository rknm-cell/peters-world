import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { ReactScanProvider } from "~/components/ReactScanProvider";

export const metadata: Metadata = {
  title: "Tiny World - Create Your Own Micro World",
  description:
    "Build and explore tiny worlds with our interactive 3D world builder",
  icons: [{ rel: "icon", url: "/globe.png" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Modak&display=swap" rel="stylesheet" />
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
