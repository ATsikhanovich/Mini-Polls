export interface Poll {
  id: string;
  question: string;
  slug: string;
  expiresAt: string | null; // ISO 8601
  isClosed: boolean;
  createdAt: string; // ISO 8601
  options: PollOption[];
}

export interface PollOption {
  id: string;
  text: string;
  sortOrder: number;
}

export interface PollResults {
  question: string;
  isClosed: boolean;
  totalVotes: number;
  options: OptionResult[];
}

export interface OptionResult {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

export interface ManagementOption {
  id: string;
  text: string;
  sortOrder: number;
  voteCount: number;
  percentage: number;
}

export interface ManagementPoll {
  id: string;
  question: string;
  slug: string;
  isClosed: boolean;
  expiresAt: string | null;
  closedAt: string | null;
  createdAt: string;
  totalVotes: number;
  options: ManagementOption[];
}

export interface CastVoteResponse {
  voteId: string;
  pollOptionId: string;
  castAt: string; // ISO 8601
}

export interface CreatePollRequest {
  question: string;
  options: string[];
  expiresAt?: string | null;
}

export interface CreatePollResponse {
  slug: string;
  managementToken: string;
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
