import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#212121] text-[#f8f8f8]">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-primary-400 hover:text-primary-300 transition-colors"
          >
            Mini-Polls
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
