import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, getPollByManagementToken } from '../api/polls';
import { CopyButton } from '../components/CopyButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import type { ManagementPoll } from '../types/poll';
import { derivePollStatus } from '../utils/derivePollStatus';
import NotFoundPage from './NotFoundPage';

export default function ManagePage() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<ManagementPoll | null>(null);
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
        const response = await getPollByManagementToken(token!);
        if (!cancelled) {
          setData(response);
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
  }, [token]);

  if (loading) {
    return <p className="text-center text-white/60">Loading…</p>;
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  if (!data) {
    return <ErrorMessage message={error} />;
  }

  const status = derivePollStatus(data.isClosed, data.expiresAt);
  const votingUrl = `${window.location.origin}/p/${data.slug}`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-[#f8f8f8] tracking-tight">{data.question}</h1>
        <StatusBadge status={status} />
      </div>

      <p className="text-sm text-white/60 mb-4">
        {data.totalVotes} vote{data.totalVotes !== 1 ? 's' : ''} total
      </p>

      {data.options.map((option) => (
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

      <div className="border border-white/10 rounded-lg p-4 mt-6">
        <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
          Voting link
        </p>
        <div className="flex items-center gap-3">
          <span className="flex-1 font-mono text-sm text-primary-300 break-all">{votingUrl}</span>
          <CopyButton value={votingUrl} />
        </div>
      </div>
    </div>
  );
}
