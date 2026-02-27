import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getResults, ApiError } from '../api/polls';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { ErrorMessage } from '../components/ErrorMessage';
import type { PollResults } from '../types/poll';
import NotFoundPage from './NotFoundPage';

type ResultsRouteState = {
  alreadyVoted?: boolean;
};

export default function ResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const routeState = location.state as ResultsRouteState | null;
  const alreadyVoted = routeState?.alreadyVoted === true;

  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const data = await getResults(slug!);
        if (!cancelled) {
          setResults(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setError('Something went wrong. Please try again.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <p className="text-center text-white/60">Loading…</p>;
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  if (!results) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-[#f8f8f8] tracking-tight">{results.question}</h1>
        {results.isClosed && <StatusBadge status="closed" />}
      </div>

      {alreadyVoted && (
        <div
          role="status"
          className="bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm rounded-lg px-4 py-3 mb-4"
        >
          You have already voted on this poll.
        </div>
      )}

      <p className="text-sm text-white/60 mb-4">
        {results.totalVotes} vote{results.totalVotes !== 1 ? 's' : ''} total
      </p>

      {results.options.map((option) => (
        <div key={option.id} className="mb-4">
          <p className="font-medium text-[#f8f8f8] mb-1">{option.text}</p>
          <span className="text-sm text-white/60">
            {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''} ·{' '}
            {option.percentage.toFixed(1).replace(/\.0$/, '')}%
          </span>
          <div className="mt-1">
            <ProgressBar percentage={option.percentage} />
          </div>
        </div>
      ))}
    </div>
  );
}
