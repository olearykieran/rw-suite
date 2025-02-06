"use client";

import Link from "next/link";
import { GrayButton } from "@/components/ui/GrayButton";

export default function PublicHomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
      <h1 className="text-4xl font-bold text-white">Welcome to RW Suite</h1>
      <p className="text-lg text-white max-w-md">
        Modern construction management software.
      </p>

      {/* Buttons Row */}
      <div className="flex space-x-4">
        <Link href="/public/auth/sign-in">
          <GrayButton className="hover:bg-neutral-800">Sign In</GrayButton>
        </Link>
        <Link href="/public/auth/sign-up">
          <GrayButton className="hover:bg-neutral-100">Sign Up</GrayButton>
        </Link>
      </div>
    </div>
  );
}
