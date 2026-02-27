import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, closePoll, getPollByManagementToken, setPollExpiration } from '../api/polls';
import { CopyButton } from '../components/CopyButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import type { ManagementPoll } from '../types/poll';
import { derivePollStatus } from '../utils/derivePollStatus';
import NotFoundPage from './NotFoundPage';

const toDateTimeLocalMin = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const toDateTimeLocalValue = (iso: string | null) => (iso ? iso.slice(0, 16) : '');

export default function ManagePage() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<ManagementPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [expirationInput, setExpirationInput] = useState('');
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState<string | null>(null);
  const [expirationSuccess, setExpirationSuccess] = useState<string | null>(null);

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
          setExpirationInput(toDateTimeLocalValue(response.expiresAt));
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

  const handleClosePoll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to close this poll? This action cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    setClosing(true);
    setCloseError(null);

    try {
      await closePoll(token!);
      const refreshed = await getPollByManagementToken(token!);
      setData(refreshed);
    } catch {
      setCloseError('Failed to close the poll. Please try again.');
    } finally {
      setClosing(false);
    }
  };

  const handleSetExpiration = async () => {
    if (!expirationInput || new Date(expirationInput) <= new Date()) {
      setExpirationError('Expiration date must be in the future.');
      return;
    }

    setSavingExpiration(true);
    setExpirationError(null);
    setExpirationSuccess(null);

    try {
      await setPollExpiration(token!, { expiresAt: new Date(expirationInput).toISOString() });
      const refreshed = await getPollByManagementToken(token!);
      setData(refreshed);
      setExpirationInput(toDateTimeLocalValue(refreshed.expiresAt));
      setExpirationSuccess('Expiration updated.');
      setTimeout(() => {
        setExpirationSuccess(null);
      }, 3000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const body = err.body as Record<string, unknown> | null;
        const details = typeof body?.detail === 'string' ? body.detail : null;
        setExpirationError(details ?? 'Failed to set expiration.');
      } else {
        setExpirationError('Failed to set expiration. Please try again.');
      }
    } finally {
      setSavingExpiration(false);
    }
  };

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

      <div className="border border-white/10 rounded-lg p-4 mt-4">
        <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">
          Expiration
        </p>
        <p className="text-sm text-white/70">
          {data.expiresAt
            ? `Expires: ${new Date(data.expiresAt).toLocaleString()}`
            : 'No expiration set.'}
        </p>
      </div>

      {status === 'active' && (
        <>
          <div className="border border-white/10 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Set Expiration
            </p>
            <div className="flex items-center gap-3">
              <input
                type="datetime-local"
                aria-label="Expiration date"
                value={expirationInput}
                onChange={(e) => setExpirationInput(e.target.value)}
                min={toDateTimeLocalMin()}
                className="flex-1 bg-[#2a2a2a] border border-white/10 rounded-[var(--radius-input)] px-3 py-2
                  text-[#f8f8f8] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                style={{ colorScheme: 'dark' }}
              />
              <button
                type="button"
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-[var(--radius-btn)] transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={savingExpiration || !expirationInput}
                onClick={() => {
                  void handleSetExpiration();
                }}
              >
                {savingExpiration ? 'Saving…' : 'Save'}
              </button>
            </div>
            <ErrorMessage message={expirationError} />
            {expirationSuccess && <p className="text-green-400 text-sm mt-1">{expirationSuccess}</p>}
          </div>

          <div className="border border-white/10 rounded-lg p-4 mt-4">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
              Actions
            </p>
            <button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-[var(--radius-btn)] transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={closing}
              onClick={() => {
                void handleClosePoll();
              }}
            >
              {closing ? 'Closing…' : 'Close Poll'}
            </button>
            <ErrorMessage message={closeError} />
          </div>
        </>
      )}
    </div>
  );
}
