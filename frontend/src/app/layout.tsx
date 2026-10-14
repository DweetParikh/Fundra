import type { Metadata } from "next";
import { ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import Providers from "@/components/Providers";
import DevnetGate from "@/components/DevnetGate";

export const metadata: Metadata = {
  title: "Fundra - milestone-gated crowdfunding on Solana Devnet",
  description: "Contributions sit in a program-controlled escrow and are released milestone by milestone.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <DevnetGate>{children}</DevnetGate>
        </Providers>
      </body>
    </html>
  );
}
