// src/app/layout.tsx
import "./globals.css";
import { Poppins, Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "RW Project Management",
  description: "Enterprise Construction PM Software",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`
          ${poppins.variable} 
          ${spaceGrotesk.variable}
          bg-[var(--background)] 
          text-[var(--foreground)]
          min-h-screen
          text-black
          dark:text-white
        `}
      >
        {children}
      </body>
    </html>
  );
}
