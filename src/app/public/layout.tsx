import { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header className="w-full h-16 flex items-center px-8 justify-between  border-b border-gray-500">
        <div className="text-xl font-bold">RW Suite</div>
        <nav className="space-x-4">
          <a href="/public/about" className="hover:underline">
            About
          </a>
          <a href="/public/auth/sign-in" className="hover:underline">
            Sign In
          </a>
          <a href="/public/auth/sign-up" className="hover:underline">
            Sign Up
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
