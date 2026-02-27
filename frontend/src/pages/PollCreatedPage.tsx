import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CopyButton } from '../components/CopyButton';

interface PollCreatedState {
  votingUrl: string;
  managementUrl: string;
  slug: string;
  managementToken: string;
}

function isValidState(state: unknown): state is PollCreatedState {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof (state as Record<string, unknown>).votingUrl === 'string' &&
    typeof (state as Record<string, unknown>).managementUrl === 'string' &&
    typeof (state as Record<string, unknown>).slug === 'string' &&
    typeof (state as Record<string, unknown>).managementToken === 'string'
  );
}

export default function PollCreatedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as unknown;

  useEffect(() => {
    if (!isValidState(state)) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!isValidState(state)) {
    return null;
  }

  const { votingUrl, managementUrl, managementToken } = state;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f8f8f8] tracking-tight mb-1">Poll created!</h1>
        <p className="text-white/60 text-sm">
          Share the voting link and keep the management link safe.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Voting link */}
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
            Voting link
          </p>
          <div className="flex items-center gap-3">
            <span className="flex-1 font-mono text-sm text-primary-300 break-all">{votingUrl}</span>
            <CopyButton value={votingUrl} label="Copy" />
          </div>
        </div>

        {/* Management link */}
        <div className="border border-white/10 rounded-lg p-4">
          <p className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-1">
            Management link
          </p>
          <p className="text-xs text-white/40 mb-3">
            Keep this link private — it lets you view results and close the poll.
          </p>
          <div className="flex items-center gap-3">
            <span className="flex-1 font-mono text-sm text-primary-300 break-all">
              {managementUrl}
            </span>
            <CopyButton value={managementUrl} label="Copy" />
          </div>
        </div>

        {/* Go to manage */}
        <div className="flex justify-end mt-2">
          <Link
            to={`/manage/${managementToken}`}
            className="text-sm font-medium text-primary-400 hover:text-primary-300 transition underline underline-offset-2"
          >
            Go to management page →
          </Link>
        </div>
      </div>
    </div>
  );
}
