import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";

const inter = Inter({ subsets: ["latin"], variable: "--nf-inter" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--nf-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "Saans — Lahore smog health guardian",
  description:
    "Live Lahore air quality turned into a personal daily plan for every family member.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <LangProvider>
          {children}
        </LangProvider>
        <footer className="border-t border-hairline px-4 py-6 text-sm leading-relaxed text-body">
          <p className="mx-auto max-w-5xl">
            Saans is for health awareness, not treatment. If you feel unwell, see a doctor.
            Emergency: <strong>1122</strong>.
          </p>
        </footer>
      </body>
    </html>
  );
}
