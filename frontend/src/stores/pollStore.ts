import { create } from 'zustand';

// pollStore: holds cross-page poll state (e.g., data returned after creation).
// Prefer local useState for page-specific data fetching results.
// This store is intentionally minimal — expand only when cross-component
// sharing is needed.

interface PollStore {
  // Placeholder — will be expanded when poll creation is implemented.
  _placeholder: null;
}

export const usePollStore = create<PollStore>(() => ({
  _placeholder: null,
}));
