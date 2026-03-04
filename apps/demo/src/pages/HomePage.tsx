type LinkCardProps = {
  title: string;
  subtitle?: string;
  href: string;
  gradient: string;
};

function LinkCard({ title, subtitle, href, gradient }: LinkCardProps) {
  return (
    <a
      href={href}
      className={[
        'w-[520px] max-w-[88vw] h-[150px] rounded-[28px] flex flex-col items-center justify-center',
        'shadow-[0_18px_45px_rgba(15,23,42,0.18)] hover:shadow-[0_22px_60px_rgba(15,23,42,0.22)]',
        'transition-shadow duration-200 select-none',
        gradient,
      ].join(' ')}
    >
      <div className="text-white font-extrabold tracking-tight text-[44px] leading-none">{title}</div>
      {subtitle ? <div className="mt-2 text-white/90 text-sm font-semibold">{subtitle}</div> : null}
    </a>
  );
}

export default function HomePage() {
  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex items-center justify-center">
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="text-[44px] leading-none font-light text-slate-500 tracking-wide">Yoga Canvas Examples</div>
        <div className="mt-12 flex flex-col items-center gap-10">
          <LinkCard
            title="Playground"
            subtitle="实时编辑 + 预览"
            href="#/playground"
            gradient="bg-gradient-to-r from-violet-500 to-fuchsia-500"
          />
          <LinkCard
            title="Editor"
            subtitle="工作台 + 可视化编辑器"
            href="#/workspace"
            gradient="bg-gradient-to-r from-fuchsia-500 to-rose-500"
          />
          <LinkCard
            title="Components"
            subtitle="组件能力设计图画布"
            href="#/components"
            gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
          />
        </div>
        <div className="mt-14 text-sm text-slate-900">Yoga Canvas</div>
      </div>
    </div>
  );
}

