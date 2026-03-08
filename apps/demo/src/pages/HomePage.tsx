import { useCallback } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { DemoHeaderActions } from "../components/DemoHeaderActions";
import { useDemoI18n } from "../i18n";

export default function HomePage() {
  const { t } = useDemoI18n();
  const navigate = useNavigate();
  const goToWorkspace = useCallback(() => {
    navigate("/workspace");
  }, [navigate]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0">
        <div className="absolute -inset-[35%] bg-[radial-gradient(circle_at_20%_15%,rgba(168,85,247,0.32),transparent_55%),radial-gradient(circle_at_72%_30%,rgba(59,130,246,0.26),transparent_58%),radial-gradient(circle_at_60%_80%,rgba(34,197,94,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent_30%,rgba(255,255,255,0.03))]" />
      </div>

      <div className="relative h-full">
        <div className="mx-auto max-w-6xl h-full px-6">
          <div className="pt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl border border-white/15 backdrop-blur flex items-center justify-center">
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
            <DemoHeaderActions variant="dark" showDocs />
          </div>

          <div className="mt-14 grid grid-cols-1 gap-10 items-start">
            <div className="min-w-0">
              <h1 className="mt-6 text-[46px] leading-[1.05] font-extrabold tracking-tight">
                {t("home.hero.lead")}
                <span className="block py-1 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200">
                  {t("home.hero.highlight")}
                </span>
                {t("home.hero.tail")}
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/65 max-w-[56ch]">
                {t("home.intro")}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  className="group cursor-pointer inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-slate-900 text-sm font-semibold shadow-[0_18px_60px_rgba(0,0,0,0.35)] hover:shadow-[0_22px_80px_rgba(0,0,0,0.45)] transition-shadow"
                  onClick={goToWorkspace}
                >
                  {t("home.cta")}
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3 max-w-[560px]">
                {[
                  {
                    label: t("home.stats.layoutEngine"),
                    value: "Yoga Flexbox",
                  },
                  {
                    label: t("home.stats.renderTarget"),
                    value: "Canvas (H5/WX) / DOM",
                  },
                  {
                    label: t("home.stats.editor"),
                    value: "HitTest / Select / Inspect",
                  },
                  { label: t("home.stats.export"), value: "JSON / DOM / Image" },
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
          </div>
        </div>
      </div>
    </div>
  );
}
