import { useEditor } from '../../store/editor';
import { ColorInput, Field, TextInput } from '../ui/controls';
import { CssSection } from './CssSection';
import { ElementSection } from './ElementSection';
import { Section } from './Section';
import { StateSection } from './StateSection';
import {
  BorderSection,
  EffectsSection,
  FillSection,
  LayoutSection,
  PositionSection,
  SizeSection,
  SpacingSection,
  TypographySection,
} from './StyleSections';
import './inspector.css';

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'system-ui, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  '"DM Mono", monospace',
  'ui-monospace, monospace',
  'inherit',
];

export function Inspector() {
  const selectedId = useEditor((s) => (s.selectedId && s.doc.nodes[s.selectedId] ? s.selectedId : null));

  return (
    <aside className="inspector ui-scroll">
      <datalist id="font-families">
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <StateSection />
      {selectedId ? (
        // Keyed so local drafts reset when switching elements.
        <div key={selectedId}>
          <ElementSection nodeId={selectedId} />
          <LayoutSection nodeId={selectedId} />
          <SizeSection nodeId={selectedId} />
          <SpacingSection nodeId={selectedId} />
          <TypographySection nodeId={selectedId} />
          <FillSection nodeId={selectedId} />
          <BorderSection nodeId={selectedId} />
          <EffectsSection nodeId={selectedId} />
          <PositionSection nodeId={selectedId} />
          <CssSection nodeId={selectedId} />
        </div>
      ) : (
        <ComponentSection />
      )}
    </aside>
  );
}

function ComponentSection() {
  const name = useEditor((s) => s.doc.name);
  const background = useEditor((s) => s.doc.canvas.background);
  const edit = useEditor((s) => s.edit);
  return (
    <Section title="Component">
      <div className="inspector-grid is-cols-1">
        <Field label="Name">
          <TextInput value={name} onChange={(v) => v.trim() && edit((d) => void (d.name = v.trim()))} />
        </Field>
        <Field label="Canvas background">
          <ColorInput
            value={background}
            onChange={(v, o) => edit((d) => void (d.canvas.background = v || '#f4f4f5'), { coalesce: o?.coalesce && 'canvas-bg' })}
          />
        </Field>
      </div>
      <p className="inspector-hint">Select an element in a canvas or the Layers panel to edit its styles.</p>
    </Section>
  );
}
