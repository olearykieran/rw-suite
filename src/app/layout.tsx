// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "RW Project Management",
  description: "Enterprise Construction PM Software",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        {children}
      </body>
    </html>
  );
}
