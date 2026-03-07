import { useCallback, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

import 'highlight.js/styles/github-dark.css';

function isExternalHref(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

function getSamePageHash(href: string): string | null {
  if (href.startsWith('#')) return href;
  try {
    const u = new URL(href, window.location.href);
    if (u.origin !== window.location.origin) return null;
    if (u.pathname !== window.location.pathname) return null;
    return u.hash || null;
  } catch {
    return null;
  }
}

function hashToId(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const raw = hash.slice(1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function findScrollContainer(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node) {
    const overflowY = window.getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

export function MarkdownView({ markdown }: { markdown: string }) {
  const scrollToHash = useCallback((hash: string, behavior: ScrollBehavior): boolean => {
    const id = hashToId(hash);
    if (!id) return false;
    const el = document.getElementById(id);
    if (!el) return false;
    const scrollContainer = findScrollContainer(el);
    if (!scrollContainer) return false;
    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop = scrollContainer.scrollTop + (elRect.top - containerRect.top);
    scrollContainer.scrollTo({ top: nextTop, behavior });
    return true;
  }, []);

  useEffect(() => {
    const initialHash = window.location.hash;
    if (initialHash) {
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(initialHash, 'auto')));
    }

    const onNav = () => {
      const h = window.location.hash;
      if (!h) return;
      requestAnimationFrame(() => scrollToHash(h, 'auto'));
    };
    window.addEventListener('hashchange', onNav);
    window.addEventListener('popstate', onNav);
    return () => {
      window.removeEventListener('hashchange', onNav);
      window.removeEventListener('popstate', onNav);
    };
  }, [markdown, scrollToHash]);

  const components: Components = useMemo(
    () => ({
      h1: ({ children, ...props }) => (
        <h1 {...props} className="text-[34px] leading-[1.1] font-extrabold tracking-tight text-white mb-4">
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 {...props} className="text-xl font-bold text-white mt-10 mb-3">
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 {...props} className="text-base font-bold text-white mt-8 mb-2">
          {children}
        </h3>
      ),
      p: ({ children, ...props }) => (
        <p {...props} className="text-sm leading-6 text-white/70 mb-4">
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => (
        <ul {...props} className="list-disc pl-5 text-sm leading-6 text-white/70 mb-4">
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol {...props} className="list-decimal pl-5 text-sm leading-6 text-white/70 mb-4">
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li {...props} className="my-1">
          {children}
        </li>
      ),
      a: ({ children, href, ...props }) => {
        const safeHref = href ?? '#';
        const external = isExternalHref(safeHref);
        return (
          <a
            {...props}
            href={safeHref}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="text-cyan-200 hover:text-cyan-100 underline underline-offset-4"
            onClick={(e) => {
              if (external) return;
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              const hash = getSamePageHash(safeHref);
              if (!hash) return;
              const handled = scrollToHash(hash, 'smooth');
              if (!handled) return;
              e.preventDefault();
              const url = new URL(window.location.href);
              url.hash = hash;
              window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
            }}
          >
            {children}
          </a>
        );
      },
      hr: () => <div className="my-8 h-px bg-white/10" />,
      blockquote: ({ children, ...props }) => (
        <blockquote
          {...props}
          className="my-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75"
        >
          {children}
        </blockquote>
      ),
      pre: ({ children, ...props }) => (
        <pre
          {...props}
          className="my-4 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-[12px] leading-5"
        >
          {children}
        </pre>
      ),
      code: ({ children, className, ...props }) => {
        const raw = String(children ?? '');
        const isInline = !raw.includes('\n');
        if (isInline) {
          return (
            <code {...props} className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white/90 text-[12px] font-mono">
              {children}
            </code>
          );
        }
        return (
          <code
            {...props}
            className={`font-mono text-[12px] leading-5 ${typeof className === 'string' ? className : ''}`}
          >
            {children}
          </code>
        );
      },
      table: ({ children, ...props }) => (
        <div className="my-4 overflow-auto rounded-2xl border border-white/10">
          <table {...props} className="w-full text-left text-sm text-white/75">
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead {...props} className="bg-white/5 text-white/85">
          {children}
        </thead>
      ),
      tbody: ({ children, ...props }) => (
        <tbody {...props} className="divide-y divide-white/10">
          {children}
        </tbody>
      ),
      tr: ({ children, ...props }) => (
        <tr {...props} className="hover:bg-white/5">
          {children}
        </tr>
      ),
      th: ({ children, ...props }) => (
        <th {...props} className="px-3 py-2 font-semibold">
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td {...props} className="px-3 py-2 align-top">
          {children}
        </td>
      ),
    }),
    [scrollToHash],
  );

  return (
    <div className="min-w-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          rehypeHighlight,
        ]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
