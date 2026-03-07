export type DocEntry = {
  slug: string;
  title: string;
  description?: string;
  order: number;
  markdown: string;
};

type RawModuleMap = Record<string, string>;

function basenameNoExt(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const base = normalized.split('/').pop() ?? normalized;
  return base.replace(/\.md$/i, '');
}

type Frontmatter = {
  title?: string;
  description?: string;
  order?: number;
  slug?: string;
};

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const source = raw.replace(/^\uFEFF/, '');
  if (!source.startsWith('---')) {
    return { frontmatter: {}, body: source };
  }

  const endIdx = source.indexOf('\n---', 3);
  if (endIdx < 0) {
    return { frontmatter: {}, body: source };
  }

  const fmRaw = source.slice(3, endIdx).trim();
  const body = source.slice(endIdx + '\n---'.length).replace(/^\s+/, '');

  const fm: Frontmatter = {};
  for (const line of fmRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const valueRaw = m[2].trim();
    const value = valueRaw.replace(/^['"]|['"]$/g, '').trim();
    if (key === 'title') fm.title = value;
    if (key === 'description') fm.description = value;
    if (key === 'slug') fm.slug = value;
    if (key === 'order') {
      const n = Number.parseFloat(value);
      if (Number.isFinite(n)) fm.order = n;
    }
  }

  return { frontmatter: fm, body };
}

function parseEntries(modules: RawModuleMap): DocEntry[] {
  return Object.entries(modules).map(([path, raw]) => {
    const { frontmatter, body } = parseFrontmatter(raw);
    const slug = frontmatter.slug?.trim() ? frontmatter.slug.trim() : basenameNoExt(path);
    const title = frontmatter.title?.trim() ? frontmatter.title.trim() : slug;
    const description = frontmatter.description?.trim() ? frontmatter.description.trim() : undefined;
    const order = typeof frontmatter.order === 'number' && Number.isFinite(frontmatter.order) ? frontmatter.order : 999;
    return {
      slug,
      title,
      description,
      order,
      markdown: body.trim(),
    };
  });
}

const zhModules = import.meta.glob('./content/zh/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as RawModuleMap;

const enModules = import.meta.glob('./content/en/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as RawModuleMap;

const INDEX_ZH = parseEntries(zhModules).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
const INDEX_EN = parseEntries(enModules).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export function getDocIndex(locale: 'zh' | 'en'): DocEntry[] {
  return locale === 'zh' ? INDEX_ZH : INDEX_EN;
}
