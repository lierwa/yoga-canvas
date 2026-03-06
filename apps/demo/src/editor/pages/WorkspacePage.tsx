import { ArrowLeft, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useYogaCanvas } from "@yoga-canvas/react";
import type { NodeDescriptor } from "@yoga-canvas/core";
import { DemoTopNav } from "../../components/DemoTopNav";
import { useDemoI18n } from "../../i18n";
import { seedTemplates } from "../templates/seedDescriptors";
import { DEVICE_PRESETS } from "../types";
import { Modal } from "../ui/Modal";
import { useSpringValue } from "../ui/useSpringValue";
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  type ProjectRecord,
  renameProject,
  WORKSPACE_DEFAULT_PANEL_ID,
} from "../workspace/projectStore";

type WorkspacePageProps = {
  onOpenProject: (projectId: string) => void;
};

function useElementSize<T extends HTMLElement>(): {
  ref: RefObject<T>;
  size: { width: number; height: number };
} {
  const ref = useRef<T>(null as unknown as T);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current as unknown as T | null;
    if (!el) return;

    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  return { ref, size };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

const previewPlaceholderLayout: NodeDescriptor = {
  type: "view",
  name: "PreviewRoot",
  style: { width: 375, height: 667 },
};

function PreviewFrame({ project }: { project: ProjectRecord }) {
  const { ref: frameRef, size: frameSize } = useElementSize<HTMLDivElement>();
  const { canvasRef, instance, ready } = useYogaCanvas(
    previewPlaceholderLayout,
    {
      platform: "h5",
      autoRender: false,
      pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    },
  );
  const [contentSize, setContentSize] = useState({ width: 375, height: 667 });

  useEffect(() => {
    if (!ready || !instance) return;

    const handleResize = (next: unknown) => {
      const s = next as { width?: unknown; height?: unknown };
      const w =
        typeof s.width === "number" && Number.isFinite(s.width) && s.width > 0
          ? s.width
          : undefined;
      const h =
        typeof s.height === "number" &&
        Number.isFinite(s.height) &&
        s.height > 0
          ? s.height
          : undefined;
      if (!w || !h) return;
      setContentSize({ width: w, height: h });
    };

    instance.on("resize", handleResize);
    try {
      if (project.payload.kind === "tree") {
        instance.loadJSON(project.payload.treeJSON);
      } else {
        void instance.update(project.payload.descriptor);
      }
      const root = instance.getRootNode();
      const rootWidth =
        typeof root?.computedLayout.width === "number" &&
        Number.isFinite(root.computedLayout.width) &&
        root.computedLayout.width > 0
          ? root.computedLayout.width
          : undefined;
      const rootHeight =
        typeof root?.computedLayout.height === "number" &&
        Number.isFinite(root.computedLayout.height) &&
        root.computedLayout.height > 0
          ? root.computedLayout.height
          : undefined;
      if (rootWidth && rootHeight)
        setContentSize({ width: rootWidth, height: rootHeight });
    } catch {
      // ignore
    }

    return () => {
      instance.off("resize", handleResize);
    };
  }, [ready, instance, project]);

  const availableW = Math.max(0, frameSize.width - 16);
  const availableH = Math.max(0, frameSize.height - 16);
  const rawScale =
    contentSize.width > 0 && contentSize.height > 0
      ? Math.min(
          availableW / contentSize.width,
          availableH / contentSize.height,
        )
      : 1;
  const scale = Number.isFinite(rawScale)
    ? Math.max(0.01, Math.min(1, rawScale))
    : 1;

  return (
    <div
      ref={frameRef as unknown as RefObject<HTMLDivElement>}
      className="relative h-36 rounded-2xl border border-slate-200/70 bg-white overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.10),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-70 bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]" />
      <canvas
        ref={canvasRef as unknown as RefObject<HTMLCanvasElement>}
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: `${contentSize.width}px`,
          height: `${contentSize.height}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
          display: "block",
        }}
      />
    </div>
  );
}

function TemplatePreviewFrame({ descriptor }: { descriptor: NodeDescriptor }) {
  const { ref: frameRef, size: frameSize } = useElementSize<HTMLDivElement>();
  const { canvasRef, instance, ready } = useYogaCanvas(
    previewPlaceholderLayout,
    {
      platform: "h5",
      autoRender: false,
      pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    },
  );
  const [contentSize, setContentSize] = useState({ width: 375, height: 667 });

  useEffect(() => {
    if (!ready || !instance) return;

    const handleResize = (next: unknown) => {
      const s = next as { width?: unknown; height?: unknown };
      const w =
        typeof s.width === "number" && Number.isFinite(s.width) && s.width > 0
          ? s.width
          : undefined;
      const h =
        typeof s.height === "number" &&
        Number.isFinite(s.height) &&
        s.height > 0
          ? s.height
          : undefined;
      if (!w || !h) return;
      setContentSize({ width: w, height: h });
    };

    instance.on("resize", handleResize);
    try {
      void instance.update(descriptor);
      const root = instance.getRootNode();
      const rootWidth =
        typeof root?.computedLayout.width === "number" &&
        Number.isFinite(root.computedLayout.width) &&
        root.computedLayout.width > 0
          ? root.computedLayout.width
          : undefined;
      const rootHeight =
        typeof root?.computedLayout.height === "number" &&
        Number.isFinite(root.computedLayout.height) &&
        root.computedLayout.height > 0
          ? root.computedLayout.height
          : undefined;
      if (rootWidth && rootHeight)
        setContentSize({ width: rootWidth, height: rootHeight });
    } catch {
      // ignore
    }

    return () => {
      instance.off("resize", handleResize);
    };
  }, [ready, instance, descriptor]);

  const availableW = Math.max(0, frameSize.width - 16);
  const availableH = Math.max(0, frameSize.height - 16);
  const rawScale =
    contentSize.width > 0 && contentSize.height > 0
      ? Math.min(
          availableW / contentSize.width,
          availableH / contentSize.height,
        )
      : 1;
  const scale = Number.isFinite(rawScale)
    ? Math.max(0.01, Math.min(1, rawScale))
    : 1;

  return (
    <div
      ref={frameRef as unknown as RefObject<HTMLDivElement>}
      className="relative h-28 rounded-xl border border-slate-200/70 bg-white overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.10),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(236,72,153,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-70 bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]" />
      <canvas
        ref={canvasRef as unknown as RefObject<HTMLCanvasElement>}
        className="absolute left-1/2 top-1/2 pointer-events-none"
        style={{
          width: `${contentSize.width}px`,
          height: `${contentSize.height}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
          display: "block",
        }}
      />
    </div>
  );
}

function getTemplateDefaultContainer(templateId: string): {
  width: number;
  height: number | "auto";
} {
  const tpl =
    seedTemplates.find((t) => t.id === templateId) ?? seedTemplates[0];
  const style = (
    tpl?.descriptor as unknown as {
      style?: { width?: unknown; height?: unknown };
    }
  )?.style;
  const width =
    typeof style?.width === "number" &&
    Number.isFinite(style.width) &&
    style.width > 0
      ? style.width
      : 375;
  const height =
    style?.height === "auto"
      ? "auto"
      : typeof style?.height === "number" &&
        Number.isFinite(style.height) &&
        style.height > 0
      ? style.height
      : 667;
  return { width, height };
}

function resolvePresetName(size: {
  width: number;
  height: number | "auto";
}): string {
  if (size.height === "auto") return "Custom";
  const matched = DEVICE_PRESETS.find(
    (p) =>
      p.name !== "Custom" && p.width === size.width && p.height === size.height,
  );
  return matched?.name ?? "Custom";
}

export default function WorkspacePage({ onOpenProject }: WorkspacePageProps) {
  const [tick, setTick] = useState(0);
  const { locale, toggleLocale, t } = useDemoI18n();
  const { defaultPanelProject, projects } = useMemo(() => {
    void tick;
    const all = listProjects().filter((p) => !p.id.startsWith("seed_"));
    const panel = all.find((p) => p.id === WORKSPACE_DEFAULT_PANEL_ID) ?? null;
    const rest = all.filter((p) => p.id !== WORKSPACE_DEFAULT_PANEL_ID);
    return { defaultPanelProject: panel, projects: rest };
  }, [tick]);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [newName, setNewName] = useState(t("workspace.defaultProjectName"));
  const defaultCreateTemplateId =
    seedTemplates.find((t) => t.id === "seed_blank")?.id ??
    seedTemplates[0]?.id ??
    "seed_blank";
  const [newTemplateId, setNewTemplateId] = useState(defaultCreateTemplateId);
  const initialContainer = getTemplateDefaultContainer(defaultCreateTemplateId);
  const [containerWidth, setContainerWidth] = useState<number>(
    initialContainer.width,
  );
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    initialContainer.height,
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(
    resolvePresetName(initialContainer),
  );
  const isBlankTemplate = newTemplateId === "seed_blank";

  const [renameName, setRenameName] = useState("");
  const [createHover, setCreateHover] = useState(false);
  const createScale = useSpringValue(createHover ? 1.02 : 1);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="h-full overflow-auto">
        <DemoTopNav
          variant="sticky"
          constrainWidth
          leftSlot={
            <button
              type="button"
              className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              onClick={() => {
                window.location.hash = "#/";
              }}
              title={t("nav.backHome")}
            >
              <ArrowLeft size={14} />
              {t("nav.back")}
            </button>
          }
          rightSlot={
            <button
              type="button"
              onClick={toggleLocale}
              className="cursor-pointer px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white transition-colors"
              title={
                locale === "zh" ? t("lang.switchToZh") : t("lang.switchToEn")
              }
            >
              {locale === "zh" ? "中文" : "EN"}
            </button>
          }
        />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-indigo-600 tracking-wide">
                Yoga Canvas
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {t("workspace.title")}
              </div>
              <div className="mt-2 text-sm text-slate-500 max-w-[56ch]">
                {t("workspace.desc")}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.28)] hover:bg-indigo-500 active:bg-indigo-700 transition-colors"
                onClick={() => {
                  const container = getTemplateDefaultContainer(
                    defaultCreateTemplateId,
                  );
                  setCreateOpen(true);
                  setNewName(t("workspace.defaultProjectName"));
                  setNewTemplateId(defaultCreateTemplateId);
                  setContainerWidth(container.width);
                  setContainerHeight(container.height);
                  setSelectedPreset(resolvePresetName(container));
                }}
              >
                <Plus size={16} />
                {t("workspace.newProject")}
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div
              className="relative rounded-2xl border border-dashed border-indigo-200 bg-white/70 backdrop-blur shadow-[0_10px_30px_rgba(2,6,23,0.06)] hover:shadow-[0_18px_60px_rgba(2,6,23,0.10)] transition-shadow"
              style={{ transform: `scale(${createScale})` }}
              onMouseEnter={() => setCreateHover(true)}
              onMouseLeave={() => setCreateHover(false)}
            >
              <button
                type="button"
                className="w-full h-full p-4 text-left cursor-pointer"
                onClick={() => {
                  const container = getTemplateDefaultContainer(
                    defaultCreateTemplateId,
                  );
                  setCreateOpen(true);
                  setNewName(t("workspace.defaultProjectName"));
                  setNewTemplateId(defaultCreateTemplateId);
                  setContainerWidth(container.width);
                  setContainerHeight(container.height);
                  setSelectedPreset(resolvePresetName(container));
                }}
              >
                <div className="relative h-36 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 border border-indigo-100/60 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(99,102,241,0.26),transparent_52%),radial-gradient(circle_at_70%_70%,rgba(236,72,153,0.16),transparent_55%)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/80 border border-slate-200 shadow-[0_10px_30px_rgba(2,6,23,0.10)]">
                      <Plus size={26} className="text-indigo-600" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  {t("workspace.addProject")}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {t("workspace.addProjectDesc")}
                </div>
              </button>
            </div>
            {defaultPanelProject ? (
              <div
                key={defaultPanelProject.id}
                className="group relative rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-[0_10px_30px_rgba(2,6,23,0.06)] hover:shadow-[0_18px_60px_rgba(2,6,23,0.10)] transition-shadow cursor-pointer"
                onClick={() => onOpenProject(defaultPanelProject.id)}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-fuchsia-500/4 group-hover:to-cyan-500/5 transition-colors pointer-events-none" />
                <div className="relative p-4">
                  <PreviewFrame project={defaultPanelProject} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mt-3 text-sm font-semibold text-slate-900 truncate">
                        {defaultPanelProject.name}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {t("workspace.recentUpdated")}
                        {formatTime(defaultPanelProject.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title={t("workspace.action.rename")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingId(defaultPanelProject.id);
                          setRenameName(defaultPanelProject.name);
                          setRenameOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title={t("workspace.action.duplicate")}
                        onClick={(e) => {
                          e.stopPropagation();
                          const copied = duplicateProject(
                            defaultPanelProject.id,
                          );
                          setTick((v) => v + 1);
                          if (copied) onOpenProject(copied.id);
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t("workspace.action.delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(defaultPanelProject.id);
                          setTick((v) => v + 1);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {projects.map((p) => (
              <div
                key={p.id}
                className="group relative rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur shadow-[0_10px_30px_rgba(2,6,23,0.06)] hover:shadow-[0_18px_60px_rgba(2,6,23,0.10)] transition-shadow cursor-pointer"
                onClick={() => onOpenProject(p.id)}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-fuchsia-500/4 group-hover:to-cyan-500/5 transition-colors pointer-events-none" />
                <div className="relative p-4">
                  <PreviewFrame project={p} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mt-3 text-sm font-semibold text-slate-900 truncate">
                        {p.name}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {t("workspace.recentUpdated")}
                        {formatTime(p.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title={t("workspace.action.rename")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingId(p.id);
                          setRenameName(p.name);
                          setRenameOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title={t("workspace.action.duplicate")}
                        onClick={(e) => {
                          e.stopPropagation();
                          const copied = duplicateProject(p.id);
                          setTick((v) => v + 1);
                          if (copied) onOpenProject(copied.id);
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={t("workspace.action.delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(p.id);
                          setTick((v) => v + 1);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={createOpen}
        title={t("workspace.modal.create.title")}
        onClose={() => setCreateOpen(false)}
        width={920}
        footer={
          <>
            <button
              type="button"
              className="px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setCreateOpen(false)}
            >
              {t("workspace.modal.create.cancel")}
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              onClick={() => {
                const nextWidth = Number(containerWidth);
                const nextHeight = containerHeight;
                const container = isBlankTemplate
                  ? Number.isFinite(nextWidth) &&
                    nextWidth > 0 &&
                    (nextHeight === "auto" ||
                      (Number.isFinite(nextHeight) && nextHeight > 0))
                    ? { width: nextWidth, height: nextHeight }
                    : undefined
                  : undefined;
                const created = createProject({
                  name: newName,
                  templateId: newTemplateId,
                  container,
                });
                setTick((v) => v + 1);
                setCreateOpen(false);
                onOpenProject(created.id);
              }}
            >
              {t("workspace.modal.create.createAndOpen")}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="w-full max-w-[520px]">
            <div className="text-xs font-medium text-slate-600 mb-2">
              {t("workspace.modal.create.projectName")}
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300"
              placeholder={t("workspace.modal.create.projectNamePlaceholder")}
            />
          </div>

          <div className="w-full max-w-[520px]">
            <div className="text-xs font-medium text-slate-600 mb-2">
              {t("workspace.modal.create.canvasSize")}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedPreset}
                onChange={(e) => {
                  if (!isBlankTemplate) return;
                  const name = e.target.value;
                  setSelectedPreset(name);
                  if (name === "Custom") return;
                  const preset = DEVICE_PRESETS.find((p) => p.name === name);
                  if (!preset) return;
                  setContainerWidth(preset.width);
                  setContainerHeight(preset.height);
                }}
                disabled={!isBlankTemplate}
                className="max-w-[520px] w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {DEVICE_PRESETS.filter((p) => p.name !== "Custom").map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.width}×{p.height})
                  </option>
                ))}
                <option value="Custom">
                  {t("workspace.preset.custom")} ({containerWidth}×
                  {containerHeight === "auto" ? "auto" : containerHeight})
                </option>
              </select>
            </div>
            {!isBlankTemplate ? (
              <div className="mt-2 text-[11px] text-slate-500">
                {t("workspace.modal.create.templateLockedHint")}
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2 max-w-[520px]">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-500">
                  {t("workspace.modal.create.width")}
                </div>
                <input
                  type="number"
                  value={containerWidth}
                  onChange={(e) => {
                    if (!isBlankTemplate) return;
                    setSelectedPreset("Custom");
                    setContainerWidth(Number(e.target.value));
                  }}
                  disabled={!isBlankTemplate}
                  className="mt-1 p-1 w-full text-sm font-semibold text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-[11px] text-slate-500">
                  {t("workspace.modal.create.height")}
                </div>
                <input
                  value={
                    containerHeight === "auto"
                      ? "auto"
                      : String(containerHeight)
                  }
                  onChange={(e) => {
                    if (!isBlankTemplate) return;
                    const raw = e.target.value.trim();
                    setSelectedPreset("Custom");
                    if (!raw || raw.toLowerCase() === "auto") {
                      setContainerHeight("auto");
                      return;
                    }
                    const next = Number(raw);
                    if (!Number.isFinite(next)) return;
                    setContainerHeight(next);
                  }}
                  disabled={!isBlankTemplate}
                  className="mt-1 p-1 w-full text-sm font-semibold text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600 mb-3">
              {t("workspace.modal.create.selectTemplate")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {seedTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={[
                    "rounded-2xl border p-3 text-left transition-colors w-full mx-auto min-w-[240px] max-w-[360px]",
                    newTemplateId === tpl.id
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                  onClick={() => {
                    const container = getTemplateDefaultContainer(tpl.id);
                    setNewTemplateId(tpl.id);
                    setContainerWidth(container.width);
                    setContainerHeight(container.height);
                    setSelectedPreset(resolvePresetName(container));
                  }}
                >
                  <TemplatePreviewFrame descriptor={tpl.descriptor} />
                  <div className="mt-2 text-sm font-semibold text-slate-900 truncate">
                    {tpl.id === "seed_blank"
                      ? t("template.seed_blank.name")
                      : tpl.id === "seed_legacy_demo"
                      ? t("template.seed_legacy_demo.name")
                      : tpl.id === "seed_share_poster"
                      ? t("template.seed_share_poster.name")
                      : tpl.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug max-h-8 overflow-hidden">
                    {tpl.id === "seed_blank"
                      ? t("template.seed_blank.desc")
                      : tpl.id === "seed_legacy_demo"
                      ? t("template.seed_legacy_demo.desc")
                      : tpl.id === "seed_share_poster"
                      ? t("template.seed_share_poster.desc")
                      : tpl.description ?? ""}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={renameOpen}
        title={t("workspace.modal.rename.title")}
        onClose={() => setRenameOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setRenameOpen(false)}
            >
              {t("workspace.modal.rename.cancel")}
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              onClick={() => {
                if (!pendingId) return;
                renameProject(pendingId, renameName);
                setTick((v) => v + 1);
                setRenameOpen(false);
              }}
            >
              {t("workspace.modal.rename.save")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-600">
            {t("workspace.modal.rename.projectName")}
          </div>
          <input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-300"
            placeholder={t("workspace.modal.rename.placeholder")}
          />
        </div>
      </Modal>
    </div>
  );
}
