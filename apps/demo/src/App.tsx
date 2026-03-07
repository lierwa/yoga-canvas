import { Suspense, lazy } from 'react';
import { DemoI18nProvider } from './i18n';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage'));
const DocsPage = lazy(() => import('./pages/docs/DocsPage'));
const WorkspacePage = lazy(() => import('./editor/pages/WorkspacePage'));
const EditorPage = lazy(() => import('./editor/pages/EditorPage'));

function WorkspaceRoute() {
  const navigate = useNavigate();
  return <WorkspacePage onOpenProject={(projectId: string) => navigate(`/editor/${encodeURIComponent(projectId)}`)} />;
}

function EditorRoute() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <Navigate to="/workspace" replace />;
  return <EditorPage projectId={projectId} onExit={() => navigate('/workspace')} />;
}

export default function App() {
  return (
    <DemoI18nProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/docs/:slug?" element={<DocsPage />} />
            <Route path="/workspace" element={<WorkspaceRoute />} />
            <Route path="/editor/:projectId" element={<EditorRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DemoI18nProvider>
  );
}
