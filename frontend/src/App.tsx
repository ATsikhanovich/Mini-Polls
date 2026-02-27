import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import CreatePollPage from './pages/CreatePollPage';
import PollCreatedPage from './pages/PollCreatedPage';
import VotePage from './pages/VotePage';
import ResultsPage from './pages/ResultsPage';
import ManagePage from './pages/ManagePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CreatePollPage />} />
        <Route path="/poll-created" element={<PollCreatedPage />} />
        <Route path="/p/:slug" element={<VotePage />} />
        <Route path="/p/:slug/results" element={<ResultsPage />} />
        <Route path="/manage/:token" element={<ManagePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
