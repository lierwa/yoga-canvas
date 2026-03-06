import { useEffect, useMemo, useState } from 'react';
import { DemoI18nProvider } from './i18n';
import EditorAppPage from './pages/EditorAppPage';
import HomePage from './pages/HomePage';

type DemoRoute = 'home' | 'editor';

function normalizeHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function parseDemoRoute(hash: string): DemoRoute {
  const path = normalizeHash(hash || '#/');
  if (path === '/') return 'home';
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

  const page = route === 'editor' ? <EditorAppPage /> : <HomePage />;

  return <DemoI18nProvider>{page}</DemoI18nProvider>;
}
