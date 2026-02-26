export interface Poll {
  id: string;
  question: string;
  slug: string;
  expiresAt: string | null; // ISO 8601
  closedAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
  status: 'active' | 'closed' | 'expired';
  options: PollOption[];
}

export interface PollOption {
  id: string;
  text: string;
  sortOrder: number;
}

export interface PollResults {
  pollId: string;
  question: string;
  status: 'active' | 'closed' | 'expired';
  totalVotes: number;
  options: OptionResult[];
}

export interface OptionResult {
  optionId: string;
  text: string;
  voteCount: number;
  percentage: number;
}

export interface CreatePollRequest {
  question: string;
  options: string[];
  expiresAt?: string | null;
}

export interface CreatePollResponse {
  slug: string;
  managementToken: string;
  votingUrl: string;
  managementUrl: string;
}

export interface CastVoteRequest {
  optionId: string;
}

export interface VoteCheckResponse {
  hasVoted: boolean;
}

export interface SetExpirationRequest {
  expiresAt: string; // ISO 8601, must be in the future
}
