import { useEffect, useState } from 'react';
import EditorPage from './pages/EditorPage';
import WorkspacePage from './pages/WorkspacePage';
import { goToEditor, goToWorkspace, parseRoute } from './utils/hashRouter';

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) goToWorkspace();
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const route = parseRoute(hash);

  if (route.name === 'editor') {
    return <EditorPage projectId={route.projectId} onExit={goToWorkspace} />;
  }

  return <WorkspacePage onOpenProject={goToEditor} />;
}
