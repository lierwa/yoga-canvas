import { useCallback, useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useDemoI18n } from "../i18n";

type ProductKey = "playground" | "workspace" | "components";

type ProductCard = {
  key: ProductKey;
  title: string;
  subtitle: string;
  desc: string;
  href: string;
  accent: { from: string; to: string };
  bullets: string[];
};

export default function HomePage() {
  const { locale, toggleLocale, t } = useDemoI18n();
  const products: ProductCard[] = useMemo(
    () => [
      {
        key: "playground",
        title: "Playground",
        subtitle: t("product.playground.subtitle"),
        desc: t("product.playground.desc"),
        href: "#/playground",
        accent: { from: "#a78bfa", to: "#ec4899" },
        bullets: [
          t("product.playground.b1"),
          t("product.playground.b2"),
          t("product.playground.b3"),
        ],
      },
      {
        key: "workspace",
        title: "Workspace",
        subtitle: t("product.workspace.subtitle"),
        desc: t("product.workspace.desc"),
        href: "#/workspace",
        accent: { from: "#fb7185", to: "#f97316" },
        bullets: [
          t("product.workspace.b1"),
          t("product.workspace.b2"),
          t("product.workspace.b3"),
        ],
      },
      {
        key: "components",
        title: "Components",
        subtitle: t("product.components.subtitle"),
        desc: t("product.components.desc"),
        href: "#/components",
        accent: { from: "#60a5fa", to: "#22c55e" },
        bullets: [
          t("product.components.b1"),
          t("product.components.b2"),
          t("product.components.b3"),
        ],
      },
    ],
    [t],
  );

  const goToProduct = useCallback(
    (key: ProductKey) => {
      const item = products.find((p) => p.key === key);
      if (!item) return;
      window.location.hash = item.href;
    },
    [products],
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0">
        <div className="absolute -inset-[35%] bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,0.32),transparent_55%),radial-gradient(circle_at_72%_30%,rgba(59,130,246,0.26),transparent_58%),radial-gradient(circle_at_60%_80%,rgba(34,197,94,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_30%,rgba(255,255,255,0.03))]" />
      </div>

      <div className="relative h-full">
        <div className="mx-auto max-w-6xl h-full px-6">
          <div className="pt-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center">
                <Sparkles size={18} className="text-white/90" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-wide">
                  {t("home.tagline")}
                </div>
                <div className="text-[11px] text-white/55">
                  {t("home.subtitle")}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleLocale}
              className="px-3 py-2 rounded-2xl bg-white/7 border border-white/12 backdrop-blur text-[11px] font-semibold text-white/75 hover:bg-white/10 transition-colors"
              title={locale === "zh" ? "Switch to English" : "切换中文"}
            >
              {locale === "zh" ? "EN" : "中文"}
            </button>
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="min-w-0">
              <h1 className="mt-6 text-[46px] leading-[1.05] font-extrabold tracking-tight">
                {t("home.hero.lead")}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200">
                  {t("home.hero.highlight")}
                </span>
                {t("home.hero.tail")}
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/65 max-w-[54ch]">
                {t("home.intro")}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-slate-900 text-sm font-semibold shadow-[0_18px_60px_rgba(0,0,0,0.35)] hover:shadow-[0_22px_80px_rgba(0,0,0,0.45)] transition-shadow"
                  onClick={() => goToProduct("playground")}
                >
                  {t("home.cta")}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3 max-w-[560px]">
                {[
                  { label: t("home.stats.layoutEngine"), value: "Yoga Flex Layout" },
                  { label: t("home.stats.renderTarget"), value: "Canvas / DOM" },
                  { label: t("home.stats.editor"), value: "Selection / Zoom / Pan" },
                  { label: t("home.stats.export"), value: "JSON / Image" },
                ].map((x) => (
                  <div
                    key={x.label}
                    className="rounded-2xl bg-white/7 border border-white/12 backdrop-blur px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
                  >
                    <div className="text-[11px] font-semibold text-white/55 tracking-wide">
                      {x.label}
                    </div>
                    <div className="mt-1 text-sm font-bold text-white/90">
                      {x.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="grid gap-4">
                {products.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className="group relative text-left cursor-pointer select-none"
                    onClick={() => goToProduct(p.key)}
                  >
                    <div
                      className="relative rounded-[28px] border border-white/14 bg-white/9 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.35)] overflow-hidden"
                      style={{
                        transition:
                          "transform 220ms ease, border-color 220ms ease, background-color 220ms ease",
                      }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div
                          className="absolute -inset-10"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.20), transparent 58%)",
                          }}
                        />
                      </div>
                      <div
                        className="absolute inset-0 opacity-60"
                        style={{
                          background: `linear-gradient(120deg, ${p.accent.from}, ${p.accent.to})`,
                          maskImage:
                            "radial-gradient(circle at 30% 20%, black, transparent 65%)",
                          WebkitMaskImage:
                            "radial-gradient(circle at 30% 20%, black, transparent 65%)",
                        }}
                      />
                      <div className="relative p-5">
                        <div className="flex items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-[18px] font-extrabold tracking-tight">
                                {p.title}
                              </div>
                              <div className="text-[11px] font-semibold text-white/60">
                                {p.subtitle}
                              </div>
                            </div>
                            <div className="mt-2 text-[12px] leading-5 text-white/70">
                              {p.desc}
                            </div>
                          </div>
                          <div className="shrink-0 w-11 h-11 rounded-2xl bg-white/12 border border-white/15 backdrop-blur flex items-center justify-center">
                            <ArrowRight size={18} className="text-white/85" />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {p.bullets.map((b) => (
                            <div
                              key={b}
                              className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/12 backdrop-blur text-[11px] font-semibold text-white/70"
                            >
                              {b}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
