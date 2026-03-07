import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DemoHeaderActions } from '../../components/DemoHeaderActions';
import { DemoTopNav } from '../../components/DemoTopNav';
import { useDemoI18n } from '../../i18n';
import { getDocIndex } from './docIndex';
import { MarkdownView } from './MarkdownView';

export default function DocsPage() {
  const { locale, t } = useDemoI18n();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const docs = useMemo(() => getDocIndex(locale), [locale]);

  const filteredDocs = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return docs;
    return docs.filter((x) => `${x.title} ${x.description ?? ''}`.toLowerCase().includes(query));
  }, [docs, q]);

  const active = useMemo(() => {
    const fallback = docs[0] ?? null;
    if (!slug) return fallback;
    return docs.find((x) => x.slug === slug) ?? fallback;
  }, [docs, slug]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0">
        <div className="absolute -inset-[35%] bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,0.32),transparent_55%),radial-gradient(circle_at_72%_30%,rgba(59,130,246,0.26),transparent_58%),radial-gradient(circle_at_60%_80%,rgba(34,197,94,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_30%,rgba(255,255,255,0.03))]" />
      </div>

      <div className="relative h-full overflow-hidden">
        <div className="h-full overflow-auto">
          <DemoTopNav
            variant="overlayDark"
            constrainWidth
            leftSlot={
              <button
                type="button"
                className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  navigate('/');
                }}
                title={t('nav.backHome')}
              >
                <ArrowLeft size={14} />
                {t('nav.back')}
              </button>
            }
            centerSlot={
              <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-white/85">
                <BookOpen size={16} />
                Yoga Canvas Docs
              </div>
            }
            rightSlot={
              <DemoHeaderActions variant="dark" showWorkspace />
            }
          />

          <div className="mx-auto max-w-6xl px-6 pt-28 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
              <div className="lg:sticky lg:top-24 self-start">
                <div className="rounded-3xl bg-white/6 border border-white/12 backdrop-blur shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="text-[11px] font-semibold text-white/55 tracking-wide">{t('nav.docs')}</div>
                    <div className="mt-2 relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={locale === 'zh' ? '搜索…' : 'Search…'}
                        className="w-full rounded-2xl bg-black/25 border border-white/10 pl-9 pr-3 py-2 text-[12px] text-white/85 placeholder:text-white/35 outline-none focus:ring-2 focus:ring-cyan-300/30"
                      />
                    </div>
                  </div>

                  <div className="p-2 max-h-[calc(100vh-180px)] overflow-auto">
                    {filteredDocs.map((x) => {
                      const isActive = x.slug === active?.slug;
                      return (
                        <button
                          key={x.slug}
                          type="button"
                          onClick={() => {
                            navigate(`/docs/${encodeURIComponent(x.slug)}`);
                          }}
                          className={
                            isActive
                              ? 'w-full text-left rounded-2xl px-3 py-2 bg-white/10 border border-white/15 text-white'
                              : 'w-full text-left rounded-2xl px-3 py-2 hover:bg-white/8 text-white/80'
                          }
                        >
                          <div className="text-sm font-semibold">{x.title}</div>
                          {x.description ? <div className="text-[11px] text-white/45 mt-0.5">{x.description}</div> : null}
                        </button>
                      );
                    })}
                    {filteredDocs.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-white/45">
                        {locale === 'zh' ? '没有匹配的文档' : 'No results'}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-3xl bg-white/6 border border-white/12 backdrop-blur shadow-[0_18px_60px_rgba(0,0,0,0.18)] p-6 md:p-8">
                {active ? <MarkdownView markdown={active.markdown} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
