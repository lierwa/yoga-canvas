import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../../components/Button';
import { DemoHeaderActions } from '../../components/DemoHeaderActions';
import { DemoTopNav } from '../../components/DemoTopNav';
import { useDemoI18n } from '../../i18n';
import { getDocIndex } from './docIndex';
import { MarkdownView } from './MarkdownView';

export default function DocsPage() {
  const { locale, t } = useDemoI18n();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const docs = useMemo(() => getDocIndex(locale), [locale]);

  // Handle anchor scrolling within the custom scroll container
  useEffect(() => {
    const hash = location.hash;
    if (hash && scrollContainerRef.current) {
      const id = decodeURIComponent(hash.substring(1));
      const element = scrollContainerRef.current.querySelector(`[id="${id}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

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

      <div className="relative h-full flex flex-col overflow-hidden">
        <DemoTopNav
          variant="overlayDark"
          constrainWidth
          leftSlot={
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/75 hover:!text-white hover:!bg-white/10 transition-colors"
              onClick={() => {
                navigate('/');
              }}
              title={t('nav.backHome')}
            >
              <ArrowLeft size={14} />
              {t('nav.back')}
            </Button>
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

        <div className="mx-auto w-full max-w-6xl px-6 pt-28 pb-10 flex-1 overflow-hidden">
          <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-6 lg:gap-8 h-full">
            <div className="flex flex-col shrink-0 lg:h-full overflow-hidden max-h-[30vh] lg:max-h-none">
              <div className="rounded-3xl bg-white/6 border border-white/12 backdrop-blur shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col h-full">
                <div className="px-4 py-3 border-b border-white/10 shrink-0">
                  <div className="px-2 text-sm font-semibold text-white/55 tracking-wide">{t('nav.docs')}</div>
                </div>

                <div className="p-2 overflow-y-auto flex-1 scrollbar-hide">
                  {filteredDocs.map((x) => {
                    const isActive = x.slug === active?.slug;
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        key={x.slug}
                        onClick={() => {
                          navigate(`/docs/${encodeURIComponent(x.slug)}`);
                        }}
                        className={`group w-full !flex-col !items-start !justify-start rounded-2xl px-4 py-1.5 transition-all hover:!bg-white/10 !text-white ${
                          isActive
                            ? "bg-white/12 border border-white/15 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                            : "!text-white/70 hover:!text-white border border-transparent"
                        }`}
                      >
                        <div className="text-sm font-bold tracking-wide">
                          {x.title}
                        </div>
                        {x.description ? (
                          <div className="text-[11px] text-white/45 line-clamp-1 lg:line-clamp-2 leading-normal group-hover:text-white/60">
                            {x.description}
                          </div>
                        ) : null}
                      </Button>
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

            <div
              ref={scrollContainerRef}
              className="flex-1 min-w-0 rounded-3xl bg-white/6 border border-white/12 backdrop-blur shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-y-auto h-full scroll-smooth scrollbar-hide"
            >
              <div className="p-6 md:p-8">
                {active ? <MarkdownView markdown={active.markdown} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
