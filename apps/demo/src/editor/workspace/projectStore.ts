import type { NodeDescriptor } from '@yoga-canvas/core';
import { seedTemplates } from '../templates/seedDescriptors';
import { COMPONENTS_CANVAS_CONTENT } from '../../pages/components/ComponentsCanvasContent';

export const WORKSPACE_DEFAULT_PANEL_ID = 'workspace_default_panel';
const WORKSPACE_DEFAULT_PANEL_NAME = '默认面板';

export type ProjectPayload =
  | { kind: 'descriptor'; descriptor: NodeDescriptor }
  | { kind: 'tree'; treeJSON: string };

export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  payload: ProjectPayload;
  readonly?: boolean;
};

type ProjectStoreV1 = {
  version: 1;
  projects: ProjectRecord[];
};

const STORAGE_KEY = 'yoga-canvas.projectStore.v1';

function now(): number {
  return Date.now();
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function safeParseStore(raw: string | null): ProjectStoreV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const store = parsed as ProjectStoreV1;
    if (store && store.version === 1 && Array.isArray(store.projects)) return store;
    return null;
  } catch {
    return null;
  }
}

function writeStore(store: ProjectStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

const BROKEN_IMAGE_SRCS = new Set<string>([
  'https://images.unsplash.com/photo-1526481280695-3c687fd643ed?auto=format&fit=crop&w=1200&q=80',
]);

function sanitizeDescriptor(descriptor: NodeDescriptor): { descriptor: NodeDescriptor; changed: boolean } {
  const node = descriptor as unknown as {
    type?: unknown;
    src?: unknown;
    children?: unknown;
  };

  let changed = false;
  let next: Record<string, unknown> = node as unknown as Record<string, unknown>;

  if (node.type === 'image' && typeof node.src === 'string' && BROKEN_IMAGE_SRCS.has(node.src)) {
    next = { ...(next as object), src: '' };
    changed = true;
  }

  if (Array.isArray(node.children) && node.children.length > 0) {
    let anyChildChanged = false;
    const nextChildren = node.children.map((c) => {
      const result = sanitizeDescriptor(c as NodeDescriptor);
      if (result.changed) anyChildChanged = true;
      return result.descriptor;
    });
    if (anyChildChanged) {
      next = { ...(next as object), children: nextChildren };
      changed = true;
    }
  }

  return { descriptor: next as unknown as NodeDescriptor, changed };
}

function getWorkspaceDefaultPanelDescriptor(): NodeDescriptor {
  return COMPONENTS_CANVAS_CONTENT;
}

function buildWorkspaceDefaultPanelRecord(): ProjectRecord {
  const result = sanitizeDescriptor(getWorkspaceDefaultPanelDescriptor());
  return {
    id: WORKSPACE_DEFAULT_PANEL_ID,
    name: WORKSPACE_DEFAULT_PANEL_NAME,
    createdAt: now(),
    updatedAt: now(),
    payload: { kind: 'descriptor', descriptor: result.descriptor } as const,
    readonly: false,
  };
}

function ensureSeeded(): ProjectStoreV1 {
  const existing = safeParseStore(localStorage.getItem(STORAGE_KEY));
  if (existing) {
    const seedTemplateById = new Map(seedTemplates.map((t) => [t.id, t] as const));
    const allowedSeedIds = new Set(seedTemplateById.keys());
    const filteredProjects = existing.projects.filter(
      (p) => !p.id.startsWith('seed_') || allowedSeedIds.has(p.id),
    );

    const migratedProjects = filteredProjects.map((p) => {
      const tpl = seedTemplateById.get(p.id);
      if (!tpl) return p;
      const nextDescriptor = tpl.descriptor;
      const nextDescriptorJSON = JSON.stringify(nextDescriptor);
      const currentDescriptorJSON =
        p.payload.kind === 'descriptor' ? JSON.stringify(p.payload.descriptor) : null;
      const shouldRefresh =
        p.name !== tpl.name
        || p.readonly !== false
        || p.payload.kind !== 'descriptor'
        || currentDescriptorJSON !== nextDescriptorJSON;
      if (!shouldRefresh) return p;
      return {
        ...p,
        name: tpl.name,
        updatedAt: now(),
        payload: { kind: 'descriptor', descriptor: nextDescriptor } as const,
        readonly: false,
      };
    });

    let anySanitized = false;
    const sanitizedProjects = migratedProjects.map((p) => {
      if (p.payload.kind !== 'descriptor') return p;
      const result = sanitizeDescriptor(p.payload.descriptor);
      if (!result.changed) return p;
      anySanitized = true;
      return {
        ...p,
        updatedAt: now(),
        payload: { kind: 'descriptor', descriptor: result.descriptor } as const,
      };
    });

    const existingIds = new Set(filteredProjects.map((p) => p.id));
    const missing = seedTemplates
      .filter((t) => !existingIds.has(t.id))
      .map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: now(),
        updatedAt: now(),
        payload: { kind: 'descriptor', descriptor: t.descriptor } as const,
        readonly: false,
      }));

    const removedDeprecatedSeeds = filteredProjects.length !== existing.projects.length;
    const refreshedSeeds = migratedProjects.some((p, idx) => p !== filteredProjects[idx]);
    const defaultPanelDescriptor = getWorkspaceDefaultPanelDescriptor();
    const defaultPanelDescriptorJSON = JSON.stringify(defaultPanelDescriptor);
    const nextProjectsWithDefault = (() => {
      const idx = sanitizedProjects.findIndex((p) => p.id === WORKSPACE_DEFAULT_PANEL_ID);
      const nextDefault = buildWorkspaceDefaultPanelRecord();
      if (idx < 0) return [nextDefault, ...sanitizedProjects];
      const current = sanitizedProjects[idx];
      const currentDescriptorJSON =
        current.payload.kind === 'descriptor' ? JSON.stringify(current.payload.descriptor) : null;
      const shouldRefresh =
        current.name !== WORKSPACE_DEFAULT_PANEL_NAME
        || current.payload.kind !== 'descriptor'
        || currentDescriptorJSON !== defaultPanelDescriptorJSON;
      if (!shouldRefresh) return sanitizedProjects;
      const replaced = [...sanitizedProjects];
      replaced[idx] = { ...nextDefault, createdAt: current.createdAt };
      return replaced;
    })();

    const defaultPanelChanged = nextProjectsWithDefault !== sanitizedProjects;
    if (missing.length === 0 && !removedDeprecatedSeeds && !refreshedSeeds && !anySanitized && !defaultPanelChanged) {
      return existing;
    }

    const next: ProjectStoreV1 = { version: 1, projects: [...missing, ...nextProjectsWithDefault] };
    writeStore(next);
    return next;
  }

  const seeded: ProjectRecord[] = seedTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    createdAt: now(),
    updatedAt: now(),
    payload: { kind: 'descriptor', descriptor: t.descriptor },
    readonly: false,
  }));

  const store: ProjectStoreV1 = { version: 1, projects: [buildWorkspaceDefaultPanelRecord(), ...seeded] };
  writeStore(store);
  return store;
}

export function listProjects(): ProjectRecord[] {
  const store = ensureSeeded();
  return [...store.projects].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(projectId: string): ProjectRecord | null {
  const store = ensureSeeded();
  return store.projects.find((p) => p.id === projectId) ?? null;
}

export function createProject(options: {
  name: string;
  templateId?: string;
  container?: { width: number; height: number | 'auto' };
}): ProjectRecord {
  const store = ensureSeeded();
  const templateId = options.templateId ?? seedTemplates[0]?.id ?? 'seed_legacy_demo';
  const template =
    store.projects.find((p) => p.id === templateId) ??
    store.projects.find((p) => p.id === `seed_${templateId}`);
  const payloadFromTemplate: ProjectPayload =
    template?.payload?.kind === 'descriptor'
      ? { kind: 'descriptor', descriptor: template.payload.descriptor }
      : template?.payload?.kind === 'tree'
        ? { kind: 'tree', treeJSON: template.payload.treeJSON }
        : { kind: 'descriptor', descriptor: seedTemplates[0]?.descriptor ?? seedTemplates[seedTemplates.length - 1].descriptor };

  const payload: ProjectPayload =
    payloadFromTemplate.kind === 'descriptor'
      ? {
          kind: 'descriptor',
          descriptor: {
            ...payloadFromTemplate.descriptor,
            style: {
              ...(payloadFromTemplate.descriptor.style ?? {}),
              ...(options.container?.width !== undefined ? { width: options.container.width } : null),
              ...(options.container?.height !== undefined ? { height: options.container.height } : null),
            },
          },
        }
      : payloadFromTemplate;

  const record: ProjectRecord = {
    id: generateId(),
    name: options.name.trim() || '未命名项目',
    createdAt: now(),
    updatedAt: now(),
    payload,
  };

  const next: ProjectStoreV1 = {
    version: 1,
    projects: [record, ...store.projects],
  };
  writeStore(next);
  return record;
}

export function renameProject(projectId: string, name: string): ProjectRecord | null {
  const store = ensureSeeded();
  const trimmed = name.trim();
  if (!trimmed) return null;
  const nextProjects = store.projects.map((p) =>
    p.id === projectId ? { ...p, name: trimmed, updatedAt: now() } : p,
  );
  const next: ProjectStoreV1 = { version: 1, projects: nextProjects };
  writeStore(next);
  return nextProjects.find((p) => p.id === projectId) ?? null;
}

export function deleteProject(projectId: string): void {
  const store = ensureSeeded();
  const nextProjects = store.projects.filter((p) => p.id !== projectId);
  writeStore({ version: 1, projects: nextProjects });
}

export function duplicateProject(projectId: string): ProjectRecord | null {
  const store = ensureSeeded();
  const src = store.projects.find((p) => p.id === projectId);
  if (!src) return null;

  const copy: ProjectRecord = {
    ...src,
    id: generateId(),
    name: `${src.name}（副本）`,
    createdAt: now(),
    updatedAt: now(),
  };
  writeStore({ version: 1, projects: [copy, ...store.projects] });
  return copy;
}

export function saveProjectPayload(projectId: string, payload: ProjectPayload): void {
  const store = ensureSeeded();
  const nextProjects = store.projects.map((p) =>
    p.id === projectId ? { ...p, payload, updatedAt: now() } : p,
  );
  writeStore({ version: 1, projects: nextProjects });
}
