import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-xl py-8">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-6xl font-bold tracking-wide text-primary-400 sm:text-7xl">404</h1>
          <Link
            to="/"
            className="rounded-btn bg-primary-500 px-4 py-2 text-sm font-bold uppercase tracking-wide text-text-primary transition-colors hover:bg-primary-400"
          >
            Create a poll
          </Link>
        </div>

        <h2 className="max-w-md text-2xl font-bold leading-tight text-text-primary sm:text-4xl">
          Poll not found
        </h2>

        <p className="max-w-md text-base leading-relaxed text-white/60">
          The page you are looking for does not exist or the link is invalid.
        </p>
      </div>
    </section>
  );
}
