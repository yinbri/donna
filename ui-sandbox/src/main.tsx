import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ConversationProvider } from '@elevenlabs/react';
import './styles.css';
import { Shell } from './components/Shell';
import { Landing } from './Landing';
import { ApplyPage } from './candidate/ApplyPage';
import { ResearchPage } from './candidate/ResearchPage';
import { CallPage } from './candidate/CallPage';
import { DonePage } from './candidate/DonePage';
import { FounderHome } from './founder/FounderHome';
import { CandidatePage } from './founder/CandidatePage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConversationProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Landing />} />
            <Route path="apply" element={<ApplyPage />} />
            <Route path="apply/:id/research" element={<ResearchPage />} />
            <Route path="apply/:id/call" element={<CallPage />} />
            <Route path="apply/:id/done" element={<DonePage />} />
            <Route path="founder" element={<FounderHome />} />
            <Route path="founder/candidates/:id" element={<CandidatePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConversationProvider>
  </StrictMode>,
);
