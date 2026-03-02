import { Eye, Move, Palette, Square, Type } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CanvasNode } from '../../types';

export function PreviewPropertiesPanel({ node }: { node: CanvasNode }) {
  const { computedLayout, flexStyle, visualStyle, textProps } = node;
  return (
    <div className="p-3 space-y-4 text-xs">
      <Section title="Info" icon={<Eye size={12} />}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <InfoRow label="Type" value={node.type} />
          <InfoRow label="Name" value={node.name} />
          <InfoRow label="ID" value={node.id} />
        </div>
      </Section>
      <Section title="Layout" icon={<Move size={12} />}>
        <div className="grid grid-cols-4 gap-1">
          <LayoutCell label="X" value={Math.round(computedLayout.left)} />
          <LayoutCell label="Y" value={Math.round(computedLayout.top)} />
          <LayoutCell label="W" value={Math.round(computedLayout.width)} />
          <LayoutCell label="H" value={Math.round(computedLayout.height)} />
        </div>
      </Section>
      <Section title="Flex" icon={<Square size={12} />}>
        <div className="space-y-1">
          <ReadonlyProp label="Width" value={flexStyle.width} />
          <ReadonlyProp label="Height" value={flexStyle.height} />
          <ReadonlyProp label="Flex" value={flexStyle.flex} />
          <ReadonlyProp label="Direction" value={flexStyle.flexDirection} />
          <ReadonlyProp label="Gap" value={flexStyle.gap} />
          <ReadonlyProp label="Padding" value={flexStyle.paddingTop} />
        </div>
      </Section>
      <Section title="Visual" icon={<Palette size={12} />}>
        <div className="space-y-1">
          <ReadonlyProp label="Background" value={visualStyle.backgroundColor} />
          <ReadonlyProp
            label="Border"
            value={visualStyle.borderWidth ? `${visualStyle.borderWidth}px ${visualStyle.borderColor}` : 'none'}
          />
          <ReadonlyProp label="Radius" value={visualStyle.borderRadius} />
          <ReadonlyProp label="Opacity" value={visualStyle.opacity} />
        </div>
      </Section>
      {textProps && (
        <Section title="Text" icon={<Type size={12} />}>
          <div className="space-y-1">
            <ReadonlyProp label="Content" value={textProps.content} />
            <ReadonlyProp label="Size" value={textProps.fontSize} />
            <ReadonlyProp label="Color" value={textProps.color} />
            <ReadonlyProp label="Weight" value={textProps.fontWeight} />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-2">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-mono truncate">{value}</span>
    </>
  );
}

function LayoutCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded px-2 py-1 text-center">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="font-mono text-gray-700 font-medium">{value}</div>
    </div>
  );
}

function ReadonlyProp({ label, value }: { label: string; value: unknown }) {
  const display = value === undefined ? '-' : String(value);
  return (
    <div className="flex items-center">
      <span className="w-20 text-[10px] text-gray-400 shrink-0">{label}</span>
      <span className="flex-1 text-[11px] font-mono text-gray-700 truncate">{display}</span>
    </div>
  );
}
