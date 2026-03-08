import { useState } from "react";
import type {
  MotionSpec,
  MotionEasing,
  VisualStyle,
  NodeType,
} from "@yoga-canvas/core";
import { ChevronDown, ChevronRight, Play, Trash2, Plus, X } from "lucide-react";
import { Button } from "../../components/Button";
import { FieldGrid, NumberField, SelectField } from "./property-controls";
import { useDemoI18n } from "../../i18n";

interface MotionPanelProps {
  motion: MotionSpec | undefined;
  nodeType?: NodeType;
  onMotionChange: (motion: MotionSpec | undefined) => void;
}

const EASING_OPTIONS: MotionEasing[] = [
  "linear",
  "quadIn",
  "quadOut",
  "quadInOut",
  "cubicIn",
  "cubicOut",
  "cubicInOut",
  "sinIn",
  "sinOut",
  "sinInOut",
];

type AnimatableProperty =
  | "fontSize"
  | "lineHeight"
  | "lineClamp"
  | "borderWidth"
  | "borderRadius"
  | "opacity"
  | "translateX"
  | "translateY"
  | "scaleX"
  | "scaleY"
  | "rotate"
  | "zIndex";

type MotionProperty =
  | {
      kind: "visual";
      prop: Exclude<AnimatableProperty, "fontSize" | "lineHeight" | "lineClamp">;
    }
  | {
      kind: "text";
      prop: Extract<AnimatableProperty, "fontSize" | "lineHeight" | "lineClamp">;
    };

const PROPERTY_CONFIG: Record<
  AnimatableProperty,
  {
    label: string;
    min?: number;
    max?: number;
    step: number;
    defaultFrom: number;
    defaultTo: number;
  }
> = {
  fontSize: {
    label: "Font Size",
    min: 1,
    step: 1,
    defaultFrom: 12,
    defaultTo: 18,
  },
  lineHeight: {
    label: "Line Height",
    min: 0.8,
    step: 0.1,
    defaultFrom: 1.2,
    defaultTo: 1.6,
  },
  lineClamp: {
    label: "Line Clamp",
    min: 1,
    step: 1,
    defaultFrom: 1,
    defaultTo: 2,
  },
  borderWidth: {
    label: "Border Width",
    min: 0,
    step: 1,
    defaultFrom: 0,
    defaultTo: 4,
  },
  borderRadius: {
    label: "Border Radius",
    min: 0,
    step: 2,
    defaultFrom: 0,
    defaultTo: 12,
  },
  opacity: {
    label: "Opacity",
    min: 0,
    max: 1,
    step: 0.1,
    defaultFrom: 0,
    defaultTo: 1,
  },
  translateX: {
    label: "Translate X",
    step: 10,
    defaultFrom: -50,
    defaultTo: 50,
  },
  translateY: {
    label: "Translate Y",
    step: 10,
    defaultFrom: -50,
    defaultTo: 50,
  },
  scaleX: {
    label: "Scale X",
    min: 0,
    step: 0.1,
    defaultFrom: 0.5,
    defaultTo: 1,
  },
  scaleY: {
    label: "Scale Y",
    min: 0,
    step: 0.1,
    defaultFrom: 0.5,
    defaultTo: 1,
  },
  rotate: { label: "Rotate (deg)", step: 15, defaultFrom: -45, defaultTo: 45 },
  zIndex: { label: "Z-Index", step: 1, defaultFrom: 0, defaultTo: 10 },
};

const ALL_VISUAL_PROPERTIES: Array<
  Exclude<AnimatableProperty, "fontSize" | "lineHeight" | "lineClamp">
> = [
  "borderWidth",
  "borderRadius",
  "opacity",
  "translateX",
  "translateY",
  "scaleX",
  "scaleY",
  "rotate",
  "zIndex",
];

function Divider() {
  return <div className="h-px my-2 w-full bg-gray-100" />;
}

export default function MotionPanel({
  motion,
  nodeType,
  onMotionChange,
}: MotionPanelProps) {
  const [expanded, setExpanded] = useState(!!motion);
  const { locale } = useDemoI18n();
  const isZh = locale === "zh";
  const [showAddProperty, setShowAddProperty] = useState(false);

  // Get currently animated properties
  const getActiveProperties = (): MotionProperty[] => {
    const out: MotionProperty[] = [];
    const visual = motion?.animate?.visualStyle;
    if (visual) {
      for (const prop of ALL_VISUAL_PROPERTIES) {
        if (visual[prop] !== undefined) out.push({ kind: "visual", prop });
      }
    }

    if (nodeType === "text") {
      const text = motion?.animate?.textProps;
      if (text?.fontSize !== undefined)
        out.push({ kind: "text", prop: "fontSize" });
      if (text?.lineHeight !== undefined)
        out.push({ kind: "text", prop: "lineHeight" });
      if (text?.lineClamp !== undefined)
        out.push({ kind: "text", prop: "lineClamp" });
    }

    return out;
  };

  const activeProperties = getActiveProperties();
  const activeKeySet = new Set(
    activeProperties.map((p) => `${p.kind}:${p.prop}`),
  );
  const availableProperties: MotionProperty[] = [
    ...ALL_VISUAL_PROPERTIES.map((prop) => ({ kind: "visual" as const, prop })),
    ...(nodeType === "text"
      ? (["fontSize", "lineHeight", "lineClamp"] as const).map((prop) => ({
          kind: "text" as const,
          prop,
        }))
      : []),
  ].filter((p) => !activeKeySet.has(`${p.kind}:${p.prop}`));

  const handleAddMotion = () => {
    onMotionChange({
      initial: { visualStyle: { opacity: 0 } },
      animate: { visualStyle: { opacity: 1 } },
      transition: {
        duration: 500,
        easing: "cubicInOut",
        autoStart: true,
        repeat: -1,
        yoyo: true,
      },
    });
    setExpanded(true);
  };

  const handleRemoveMotion = () => {
    onMotionChange(undefined);
    setExpanded(false);
  };

  const handleAddProperty = (p: MotionProperty) => {
    if (!motion) return;
    const config = PROPERTY_CONFIG[p.prop];
    onMotionChange({
      ...motion,
      initial: {
        ...motion.initial,
        ...(p.kind === "visual"
          ? {
              visualStyle: {
                ...(motion.initial?.visualStyle ?? {}),
                [p.prop]: config.defaultFrom,
              },
            }
          : {
              textProps: {
                ...(motion.initial?.textProps ?? {}),
                [p.prop]: config.defaultFrom,
              },
            }),
      },
      animate: {
        ...motion.animate,
        ...(p.kind === "visual"
          ? {
              visualStyle: {
                ...(motion.animate?.visualStyle ?? {}),
                [p.prop]: config.defaultTo,
              },
            }
          : {
              textProps: {
                ...(motion.animate?.textProps ?? {}),
                [p.prop]: config.defaultTo,
              },
            }),
      },
    });
    setShowAddProperty(false);
  };

  const handleRemoveProperty = (p: MotionProperty) => {
    if (!motion) return;
    const nextInitial = {
      ...(motion.initial ?? {}),
      visualStyle: { ...(motion.initial?.visualStyle ?? {}) },
      textProps: { ...(motion.initial?.textProps ?? {}) },
    };
    const nextAnimate = {
      ...(motion.animate ?? {}),
      visualStyle: { ...(motion.animate?.visualStyle ?? {}) },
      textProps: { ...(motion.animate?.textProps ?? {}) },
    };

    if (p.kind === "visual") {
      delete (nextInitial.visualStyle as Record<string, unknown>)[p.prop];
      delete (nextAnimate.visualStyle as Record<string, unknown>)[p.prop];
    } else {
      delete (nextInitial.textProps as Record<string, unknown>)[p.prop];
      delete (nextAnimate.textProps as Record<string, unknown>)[p.prop];
    }

    const animateHasAny =
      Object.keys(nextAnimate.visualStyle ?? {}).length > 0 ||
      Object.keys(nextAnimate.textProps ?? {}).length > 0;

    if (!animateHasAny) {
      onMotionChange(undefined);
      setExpanded(false);
      return;
    }

    const cleanedInitial: NonNullable<MotionSpec["initial"]> = {};
    if (Object.keys(nextInitial.visualStyle ?? {}).length) {
      cleanedInitial.visualStyle =
        nextInitial.visualStyle as Partial<VisualStyle>;
    }
    if (Object.keys(nextInitial.textProps ?? {}).length) {
      cleanedInitial.textProps = nextInitial.textProps;
    }

    const cleanedAnimate: NonNullable<MotionSpec["animate"]> = {};
    if (Object.keys(nextAnimate.visualStyle ?? {}).length) {
      cleanedAnimate.visualStyle =
        nextAnimate.visualStyle as Partial<VisualStyle>;
    }
    if (Object.keys(nextAnimate.textProps ?? {}).length) {
      cleanedAnimate.textProps = nextAnimate.textProps;
    }

    onMotionChange({
      ...motion,
      initial: cleanedInitial,
      animate: cleanedAnimate,
    });
  };

  const handleUpdateValue = (
    p: MotionProperty,
    type: "initial" | "animate",
    value: number,
  ) => {
    if (!motion) return;
    if (type === "initial") {
      onMotionChange({
        ...motion,
        initial: {
          ...motion.initial,
          ...(p.kind === "visual"
            ? {
                visualStyle: {
                  ...(motion.initial?.visualStyle ?? {}),
                  [p.prop]: value,
                },
              }
            : {
                textProps: {
                  ...(motion.initial?.textProps ?? {}),
                  [p.prop]: value,
                },
              }),
        },
      });
    } else {
      onMotionChange({
        ...motion,
        animate: {
          ...motion.animate,
          ...(p.kind === "visual"
            ? {
                visualStyle: {
                  ...(motion.animate?.visualStyle ?? {}),
                  [p.prop]: value,
                },
              }
            : {
                textProps: {
                  ...(motion.animate?.textProps ?? {}),
                  [p.prop]: value,
                },
              }),
        },
      });
    }
  };

  const handleUpdateTransition = (
    key: keyof NonNullable<MotionSpec["transition"]>,
    value: unknown,
  ) => {
    if (!motion) return;
    if (value === undefined) {
      const next = { ...(motion.transition ?? {}) } as Record<string, unknown>;
      delete next[key as string];
      onMotionChange({
        ...motion,
        transition: Object.keys(next).length
          ? (next as MotionSpec["transition"])
          : undefined,
      });
      return;
    }
    onMotionChange({
      ...motion,
      transition: {
        ...(motion.transition ?? {}),
        [key]: value,
      },
    });
  };

  if (!motion) {
    return (
      <div className="p-3 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleAddMotion}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
        >
          <Play size={14} />
          <span>Add Animation</span>
        </Button>
      </div>
    );
  }

  const transition = motion.transition ?? {};

  return (
    <div className="border-t border-gray-200">
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Animation</span>
        </div>
        <Button
          variant="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveMotion();
          }}
          className="w-6 h-6 border-transparent hover:bg-black/5 text-gray-600"
          title="Remove Animation"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Animated Properties - Initial & Animate side by side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                Properties
              </span>
              {availableProperties.length > 0 && (
                <Button
                  variant="icon"
                  onClick={() => setShowAddProperty(!showAddProperty)}
                  className="w-6 h-6 border-transparent text-blue-600 hover:bg-blue-50 rounded"
                  title="Add Property"
                >
                  <Plus size={12} />
                </Button>
              )}
            </div>

            {/* Add property dropdown */}
            {showAddProperty && availableProperties.length > 0 && (
              <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">
                  {isZh ? "选择要添加的属性" : "Select a property:"}
                </div>
                <div className="flex flex-wrap gap-1">
                  {availableProperties.map((p) => (
                    <Button
                      variant="default"
                      size="sm"
                      key={`${p.kind}:${p.prop}`}
                      onClick={() => handleAddProperty(p)}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300"
                    >
                      {PROPERTY_CONFIG[p.prop].label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Property rows */}
            {activeProperties.length === 0 ? (
              <div className="text-xs text-gray-400 italic">
                No properties. Click + to add.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[1fr_72px_72px_28px] gap-1 text-xs text-gray-500">
                  <div>Property</div>
                  <div className="text-center">From</div>
                  <div className="text-center">To</div>
                  <div></div>
                </div>

                {/* Property rows */}
                {activeProperties.map((p) => {
                  const config = PROPERTY_CONFIG[p.prop];
                  const fromValue =
                    p.kind === "visual"
                      ? motion.initial?.visualStyle?.[p.prop] ??
                        config.defaultFrom
                      : motion.initial?.textProps?.[p.prop] ??
                        config.defaultFrom;
                  const toValue =
                    p.kind === "visual"
                      ? motion.animate?.visualStyle?.[p.prop] ??
                        config.defaultTo
                      : motion.animate?.textProps?.[p.prop] ?? config.defaultTo;

                  return (
                    <div
                      key={`${p.kind}:${p.prop}`}
                      className="grid grid-cols-[1fr_72px_72px_28px] gap-1 items-center"
                    >
                      <div
                        className="text-xs text-gray-700 truncate"
                        title={config.label}
                      >
                        {config.label}
                      </div>
                      <input
                        type="number"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={fromValue}
                        onChange={(e) =>
                          handleUpdateValue(
                            p,
                            "initial",
                            Number(e.target.value),
                          )
                        }
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                      <input
                        type="number"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={toValue}
                        onChange={(e) =>
                          handleUpdateValue(
                            p,
                            "animate",
                            Number(e.target.value),
                          )
                        }
                        className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                      <Button
                        onClick={() => handleRemoveProperty(p)}
                        variant="icon"
                        className="w-6 h-6 border-transparent hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title={isZh ? "删除此属性" : "Remove property"}
                      >
                        <X size={12} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px w-full bg-gray-100" />
          {/* Transition Settings */}
          <div className="">
            <div className="text-xs text-gray-600 font-semibold mb-2">
              Transition
            </div>
            <div className="space-y-2">
              <FieldGrid cols={2}>
                <div>
                  <NumberField
                    label="Duration (ms)"
                    value={transition.duration ?? 350}
                    onChange={(val) => handleUpdateTransition("duration", val)}
                  />
                </div>
                <div>
                  <NumberField
                    label="Delay (ms)"
                    value={transition.delay ?? 0}
                    onChange={(val) => handleUpdateTransition("delay", val)}
                  />
                </div>
              </FieldGrid>
              <FieldGrid cols={2}>
                <div>
                  <SelectField
                    label="Easing"
                    value={(transition.easing ?? "cubicInOut") as string}
                    options={EASING_OPTIONS}
                    onChange={(val) => handleUpdateTransition("easing", val)}
                  />
                </div>
                <div>
                  <NumberField
                    label="Repeat (-1=∞)"
                    value={transition.repeat ?? 0}
                    onChange={(val) => handleUpdateTransition("repeat", val)}
                  />
                </div>
              </FieldGrid>

              <Divider />

              <div className="rounded-md">
                <div>
                  <div className="text-xs text-gray-600 font-semibold mb-2">
                    {isZh ? "播放" : "Playback"}
                  </div>
                  <label className="flex gap-2 cursor-pointer px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={transition.yoyo ?? false}
                      onChange={(e) =>
                        handleUpdateTransition("yoyo", e.target.checked)
                      }
                      className="mt-0.5 w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-700">
                        {isZh ? "往返播放" : "Yoyo"}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {isZh
                          ? "往返播放（配合 Repeat）"
                          : "Reverse on repeats"}
                      </div>
                    </div>
                  </label>
                  <label className="flex gap-2 cursor-pointer px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={transition.autoStart ?? true}
                      onChange={(e) =>
                        handleUpdateTransition("autoStart", e.target.checked)
                      }
                      className="mt-0.5 w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-700">
                        {isZh ? "自动开始" : "Auto Start"}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {isZh ? "加载后自动播放" : "Start automatically"}
                      </div>
                    </div>
                  </label>
                </div>

                <Divider />

                <div className="">
                  <div className="text-xs text-gray-600 font-semibold mb-2">
                    {isZh ? "结束" : "Finish"}
                  </div>
                  <div className="space-y-2">
                    <label className="flex gap-2 cursor-pointer rounded px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={transition.autoClear ?? false}
                        onChange={(e) =>
                          handleUpdateTransition("autoClear", e.target.checked)
                        }
                        className="mt-0.5 w-3 h-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0">
                        <div className="text-xs text-gray-700">
                          {isZh ? "自动清除" : "Auto Clear"}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {isZh
                            ? "结束后清除覆盖样式"
                            : "Clear overrides when finished"}
                        </div>
                      </div>
                    </label>

                    <div className="px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-700">
                          {isZh ? "结束状态" : "Finish State"}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="finishState"
                              checked={!(transition.restoreOnFinish ?? false)}
                              onChange={() =>
                                handleUpdateTransition("restoreOnFinish", false)
                              }
                              className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            {isZh ? "末状态" : "End"}
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="finishState"
                              checked={transition.restoreOnFinish ?? false}
                              onChange={() =>
                                handleUpdateTransition("restoreOnFinish", true)
                              }
                              className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            {isZh ? "初始状态" : "Start"}
                          </label>
                        </div>
                      </div>
                      <div className="mt-0.5 text-[10px] text-gray-500">
                        {isZh
                          ? "末状态=停在结束值；初始状态=回到开始值"
                          : "End=keep end state; Start=restore initial"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
