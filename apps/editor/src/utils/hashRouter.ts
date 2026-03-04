export type Route =
  | { name: 'workspace' }
  | { name: 'editor'; projectId: string };

function normalizeHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function parseRoute(hash: string): Route {
  const path = normalizeHash(hash || '#/workspace');
  if (path === '/' || path === '/workspace') return { name: 'workspace' };

  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'editor' && typeof parts[1] === 'string' && parts[1]) {
    return { name: 'editor', projectId: decodeURIComponent(parts[1]) };
  }

  return { name: 'workspace' };
}

export function goToWorkspace(): void {
  window.location.hash = '#/workspace';
}

export function goToEditor(projectId: string): void {
  window.location.hash = `#/editor/${encodeURIComponent(projectId)}`;
}

