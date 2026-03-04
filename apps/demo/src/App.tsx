import { useEffect, useMemo, useState } from 'react';
import ComponentsCanvasPage from './pages/ComponentsCanvasPage';
import EditorAppPage from './pages/EditorAppPage';
import HomePage from './pages/HomePage';
import PlaygroundPage from './pages/PlaygroundPage';

type DemoRoute = 'home' | 'playground' | 'components' | 'editor';

function normalizeHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function parseDemoRoute(hash: string): DemoRoute {
  const path = normalizeHash(hash || '#/');
  if (path === '/') return 'home';
  if (path === '/playground') return 'playground';
  if (path === '/components') return 'components';
  if (path === '/workspace') return 'editor';
  if (path.startsWith('/editor/')) return 'editor';
  return 'home';
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const route = useMemo(() => parseDemoRoute(hash), [hash]);

  if (route === 'home') {
    return <HomePage />;
  }

  if (route === 'components') {
    return <ComponentsCanvasPage />;
  }

  if (route === 'editor') {
    return <EditorAppPage />;
  }

  return <PlaygroundPage />;
}
