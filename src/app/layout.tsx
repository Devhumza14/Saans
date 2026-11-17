import type { Metadata } from "next";
import { Inter, Source_Serif_4, Noto_Nastaliq_Urdu, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--nf-inter" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--nf-serif" });
const urdu = Noto_Nastaliq_Urdu({ subsets: ["arabic"], variable: "--nf-urdu" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "Saans — Lahore smog health guardian",
  description:
    "Live Lahore air quality turned into a personal daily plan for every family member, in Urdu, Roman Urdu and English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${urdu.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <footer className="border-t border-hairline px-4 py-6 text-sm leading-relaxed text-body">
          <p className="mx-auto max-w-5xl">
            Saans sehat ki aagahi ke liye hai, ilaaj ke liye nahi. Takleef ki soorat mein doctor se rujoo karein.
            Emergency: <strong>1122</strong>.
          </p>
        </footer>
      </body>
    </html>
  );
}
