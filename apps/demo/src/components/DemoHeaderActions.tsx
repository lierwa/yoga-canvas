import { BookOpen, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoI18n } from '../i18n';

type DemoHeaderActionsVariant = 'dark' | 'light';

export function DemoHeaderActions({
  variant,
  showDocs = false,
  showWorkspace = false,
}: {
  variant: DemoHeaderActionsVariant;
  showDocs?: boolean;
  showWorkspace?: boolean;
}) {
  const { locale, toggleLocale, t } = useDemoI18n();
  const navigate = useNavigate();

  const buttonClassName =
    variant === 'dark'
      ? 'cursor-pointer px-3 py-2 rounded-2xl bg-white/7 border border-white/12 backdrop-blur text-[11px] font-semibold text-white/75 hover:bg-white/10 hover:text-white transition-colors'
      : 'cursor-pointer px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-colors';

  const iconClassName = variant === 'dark' ? 'text-white/70' : 'text-slate-600';

  return (
    <div className="flex items-center gap-2">
      {showDocs ? (
        <button
          type="button"
          onClick={() => {
            navigate('/docs');
          }}
          className={`${buttonClassName} flex items-center gap-2`}
        >
          <BookOpen size={14} className={iconClassName} />
          {t('nav.docs')}
        </button>
      ) : null}

      {showWorkspace ? (
        <button
          type="button"
          onClick={() => {
            navigate('/workspace');
          }}
          className={`${buttonClassName} flex items-center gap-2`}
        >
          <LayoutGrid size={14} className={iconClassName} />
          Workspace
        </button>
      ) : null}

      <button
        type="button"
        onClick={toggleLocale}
        className={buttonClassName}
        title={locale === 'zh' ? t('lang.switchToEn') : t('lang.switchToZh')}
      >
        {locale !== 'zh' ? 'EN' : '中文'}
      </button>
    </div>
  );
}
