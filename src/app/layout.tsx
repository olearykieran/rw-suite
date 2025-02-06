import "./globals.css";
import { Inter, Montserrat } from "next/font/google";
import { ReactNode } from "react";

// Import Inter with selected weights and assign it to a CSS variable.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter", // This CSS variable will be available to all children.
});

// Import Montserrat from Google Fonts with selected weights and assign it to a CSS variable.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat", // This CSS variable will be injected and used in our global CSS.
});

export const metadata = {
  title: "RW Project Management",
  description: "Enterprise Construction PM Software",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Apply the generated Inter variable class to <html> so that --font-inter is inherited.
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <head>
        {/* Ensure proper scaling on all devices */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className="
          bg-[var(--background)]
          text-[var(--foreground)]
          min-h-screen
          text-black
          dark:text-white
        "
      >
        {children}
      </body>
    </html>
  );
}
