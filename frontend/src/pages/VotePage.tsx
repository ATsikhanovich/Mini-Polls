import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPollBySlug, castVote, checkVote, ApiError } from '../api/polls';
import { ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';
import { derivePollStatus } from '../utils/derivePollStatus';
import type { Poll } from '../types/poll';
import NotFoundPage from './NotFoundPage';

export default function VotePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      let fetchedPoll: Poll;
      try {
        fetchedPoll = await getPollBySlug(slug!);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setError('Something went wrong. Please try again.');
          }
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;

      if (fetchedPoll.isClosed) {
        navigate(`/p/${slug}/results`, { replace: true, state: { pollClosed: true } });
        return;
      }

      try {
        const voteCheck = await checkVote(slug!);
        if (!cancelled && voteCheck.hasVoted) {
          navigate(`/p/${slug}/results`, { replace: true, state: { alreadyVoted: true } });
          return;
        }
      } catch {
        // Graceful degradation — backend will reject duplicates
      }

      if (!cancelled) {
        setPoll(fetchedPoll);
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  async function handleVote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOptionId) return;

    setSubmitting(true);
    setError(null);
    try {
      await castVote(slug!, { optionId: selectedOptionId });
      navigate(`/p/${slug}/results`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          navigate(`/p/${slug}/results`, { state: { alreadyVoted: true } });
        } else if (err.status === 410) {
          navigate(`/p/${slug}/results`, { state: { pollClosed: true } });
        } else if (err.status === 404) {
          setNotFound(true);
        } else {
          setError('Something went wrong. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-center text-white/60">Loading…</p>;
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  if (!poll) {
    return <ErrorMessage message={error} />;
  }

  const status = derivePollStatus(poll.isClosed, poll.expiresAt);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#f8f8f8] tracking-tight">{poll.question}</h1>
        {poll.isClosed && <StatusBadge status={status} />}
      </div>

      <form onSubmit={handleVote} noValidate>
        <div className="flex flex-col gap-3 mb-6">
          {poll.options.map((option) => {
            const selected = selectedOptionId === option.id;
            return (
              <label
                key={option.id}
                className={`flex items-center gap-3 border rounded-[var(--radius-card)] p-4 cursor-pointer transition ${
                  selected
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-white/10 hover:border-primary-500/50'
                }`}
              >
                <input
                  type="radio"
                  name="vote"
                  value={option.id}
                  checked={selected}
                  onChange={() => setSelectedOptionId(option.id)}
                  className="sr-only"
                />
                {/* Visual radio indicator */}
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded-full border-2 transition ${
                    selected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-white/40'
                  }`}
                />
                <span className="text-[#f8f8f8]">{option.text}</span>
              </label>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={selectedOptionId === null || submitting}
          className="bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-[var(--radius-btn)] px-5 py-2 text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Voting…' : 'Vote'}
        </button>
      </form>

      <ErrorMessage message={error} />
    </div>
  );
}
