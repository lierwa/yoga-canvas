import type { CanvasNode, FlexStyle } from '../types';

interface PropertiesPanelProps {
  node: CanvasNode | null;
  onUpdateFlexStyle: (nodeId: string, updates: Partial<FlexStyle>) => void;
}

const FLEX_DIRECTIONS = ['row', 'column', 'row-reverse', 'column-reverse'] as const;
const JUSTIFY_OPTIONS = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] as const;
const ALIGN_OPTIONS = ['flex-start', 'center', 'flex-end', 'stretch'] as const;
const WRAP_OPTIONS = ['nowrap', 'wrap'] as const;

export default function PropertiesPanel({ node, onUpdateFlexStyle }: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0">
        <p className="text-sm text-gray-400 text-center mt-8">Select a node to edit properties</p>
      </div>
    );
  }

  const s = node.flexStyle;

  const update = (updates: Partial<FlexStyle>) => {
    onUpdateFlexStyle(node.id, updates);
  };

  return (
    <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{node.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">ID: {node.id}</p>
      </div>

      {/* Layout */}
      <div className="px-4 py-3 border-b border-gray-100">
        <SectionTitle>Layout</SectionTitle>
        <div className="space-y-2.5">
          <SelectField
            label="Direction"
            value={s.flexDirection ?? 'row'}
            options={FLEX_DIRECTIONS}
            onChange={(v) => update({ flexDirection: v as FlexStyle['flexDirection'] })}
          />
          <SelectField
            label="Justify"
            value={s.justifyContent ?? 'flex-start'}
            options={JUSTIFY_OPTIONS}
            onChange={(v) => update({ justifyContent: v as FlexStyle['justifyContent'] })}
          />
          <SelectField
            label="Align Items"
            value={s.alignItems ?? 'stretch'}
            options={ALIGN_OPTIONS}
            onChange={(v) => update({ alignItems: v as FlexStyle['alignItems'] })}
          />
          <SelectField
            label="Wrap"
            value={s.flexWrap ?? 'nowrap'}
            options={WRAP_OPTIONS}
            onChange={(v) => update({ flexWrap: v as FlexStyle['flexWrap'] })}
          />
        </div>
      </div>

      {/* Size */}
      <div className="px-4 py-3 border-b border-gray-100">
        <SectionTitle>Size</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width" value={s.width} onChange={(v) => update({ width: v })} />
          <NumberField label="Height" value={s.height} onChange={(v) => update({ height: v })} />
        </div>
      </div>

      {/* Flex */}
      <div className="px-4 py-3 border-b border-gray-100">
        <SectionTitle>Flex</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Flex" value={s.flex} onChange={(v) => update({ flex: v })} />
          <NumberField label="Grow" value={s.flexGrow} onChange={(v) => update({ flexGrow: v })} />
          <NumberField label="Shrink" value={s.flexShrink} onChange={(v) => update({ flexShrink: v })} />
        </div>
      </div>

      {/* Gap */}
      <div className="px-4 py-3 border-b border-gray-100">
        <SectionTitle>Gap</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Gap" value={s.gap} onChange={(v) => update({ gap: v })} />
          <NumberField label="Row" value={s.rowGap} onChange={(v) => update({ rowGap: v })} />
          <NumberField label="Col" value={s.columnGap} onChange={(v) => update({ columnGap: v })} />
        </div>
      </div>

      {/* Padding */}
      <div className="px-4 py-3 border-b border-gray-100">
        <SectionTitle>Padding</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Top" value={s.paddingTop} onChange={(v) => update({ paddingTop: v })} />
          <NumberField label="Right" value={s.paddingRight} onChange={(v) => update({ paddingRight: v })} />
          <NumberField label="Bottom" value={s.paddingBottom} onChange={(v) => update({ paddingBottom: v })} />
          <NumberField label="Left" value={s.paddingLeft} onChange={(v) => update({ paddingLeft: v })} />
        </div>
      </div>

      {/* Margin */}
      <div className="px-4 py-3 border-b border-gray-100">
        <SectionTitle>Margin</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Top" value={s.marginTop} onChange={(v) => update({ marginTop: v })} />
          <NumberField label="Right" value={s.marginRight} onChange={(v) => update({ marginRight: v })} />
          <NumberField label="Bottom" value={s.marginBottom} onChange={(v) => update({ marginBottom: v })} />
          <NumberField label="Left" value={s.marginLeft} onChange={(v) => update({ marginLeft: v })} />
        </div>
      </div>

      {/* Computed Layout (read-only) */}
      <div className="px-4 py-3">
        <SectionTitle>Computed Layout</SectionTitle>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
          <span>x: {Math.round(node.computedLayout.left)}</span>
          <span>y: {Math.round(node.computedLayout.top)}</span>
          <span>w: {Math.round(node.computedLayout.width)}</span>
          <span>h: {Math.round(node.computedLayout.height)}</span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{children}</h4>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-gray-500 shrink-0 w-20">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
          focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
          w-full max-w-[140px]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        placeholder="-"
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : Number(v));
        }}
        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
          focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}
