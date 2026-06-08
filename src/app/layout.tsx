import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LiquiFlowProvider } from "@/providers/LiquiFlowProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiquiFlow AI — Hedera Commerce Agent",
  description:
    "AP2-gated DeFi execution with Multi-Party Payments on Hedera Testnet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <LiquiFlowProvider>{children}</LiquiFlowProvider>
      </body>
    </html>
  );
}
