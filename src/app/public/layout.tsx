import { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="w-full h-16 flex items-center px-8 justify-between bg-white shadow">
        <div className="text-xl font-bold">RW Suite</div>
        <nav className="space-x-4">
          <a href="/public/about" className="text-neutral-600 hover:underline">
            About
          </a>
          <a href="/public/auth/sign-in" className="text-neutral-600 hover:underline">
            Sign In
          </a>
          <a href="/public/auth/sign-up" className="text-neutral-600 hover:underline">
            Sign Up
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
