import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "4Agents — BNB Chain DeFi Agent Marketplace",
  description:
    "4Agents — discover and hire DeFi agents on BNB Chain with x402 and ERC-8183.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Pixel:ELSH@1&display=swap"
          rel="stylesheet"
        />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="flex min-h-full flex-col bg-surface-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
