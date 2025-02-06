// src/app/public/page.tsx  (Adjust if your public home route is different)

"use client";

import Link from "next/link";
import { GrayButton } from "@/components/ui/GrayButton"; // Your existing GrayButton

export default function PublicHomePage() {
  return (
    <div className="py-20 px-10 text-center">
      <h1 className="text-4xl font-bold text-white mb-4">Welcome to RW Suite</h1>
      <p className="text-lg text-white mb-8">Modern construction management software.</p>

      {/* Buttons row */}
      <div className="flex justify-center space-x-4">
        {/* Sign In (Black variant) */}
        <Link href="/public/auth/sign-in">
          <GrayButton className=" hover:bg-neutral-800">Sign In</GrayButton>
        </Link>

        {/* Sign Up (Outline variant) */}
        <Link href="/public/auth/sign-up">
          <GrayButton className=" hover:bg-neutral-100">Sign Up</GrayButton>
        </Link>
      </div>
    </div>
  );
}
