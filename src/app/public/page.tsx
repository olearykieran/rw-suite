export default function PublicHomePage() {
  return (
    <div className="py-20 px-10 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to RW Suite</h1>
      <p className="text-lg mb-8">
        Modern construction management software built for multi-million dollar projects.
      </p>
      <div className="flex justify-center space-x-4">
        <a
          href="/public/auth/sign-in"
          className="bg-black text-white px-6 py-3 rounded hover:bg-neutral-800"
        >
          Sign In
        </a>
        <a
          href="/public/auth/sign-up"
          className="border border-black px-6 py-3 rounded hover:bg-neutral-100"
        >
          Sign Up
        </a>
      </div>
    </div>
  );
}
