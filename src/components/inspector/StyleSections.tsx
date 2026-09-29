import { PropControl, type PropDef } from './PropControl';
import { Section } from './Section';
import { useResolvedProp } from './useStyleProp';

const opts = (...values: string[]) => values;

const DISPLAY = opts('block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'inline-block', 'inline', 'none');
const JUSTIFY = opts('flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly', 'stretch');
const ALIGN = opts('stretch', 'flex-start', 'center', 'flex-end', 'baseline');
const OVERFLOW = opts('visible', 'hidden', 'clip', 'auto', 'scroll');
const POSITION = opts('static', 'relative', 'absolute', 'fixed', 'sticky');
const WEIGHTS = [
  { value: '100', label: '100 Thin' },
  { value: '200', label: '200 Extra light' },
  { value: '300', label: '300 Light' },
  { value: '400', label: '400 Regular' },
  { value: '500', label: '500 Medium' },
  { value: '600', label: '600 Semibold' },
  { value: '700', label: '700 Bold' },
  { value: '800', label: '800 Extra bold' },
  { value: '900', label: '900 Black' },
];
const BORDER_STYLE = opts('none', 'solid', 'dashed', 'dotted', 'double');
const CURSOR = opts('auto', 'default', 'pointer', 'text', 'move', 'grab', 'not-allowed');
const TEXT_UNITS = ['px', 'em', 'rem', '%', 'vw'] as const;
const LINE_HEIGHT_UNITS = ['px', 'em', '%', 'normal'] as const;

function Grid({ nodeId, defs, cols = 2 }: { nodeId: string; defs: PropDef[]; cols?: 1 | 2 | 4 }) {
  return (
    <div className={`inspector-grid is-cols-${cols}`}>
      {defs.map((d) => (
        <PropControl key={d.prop} nodeId={nodeId} def={d} />
      ))}
    </div>
  );
}

export function LayoutSection({ nodeId }: { nodeId: string }) {
  const display = useResolvedProp(nodeId, 'display');
  const isFlex = display.includes('flex');
  const isGrid = display.includes('grid');
  return (
    <Section title="Layout">
      <Grid nodeId={nodeId} cols={1} defs={[{ prop: 'display', label: 'Display', type: 'select', options: DISPLAY }]} />
      {isFlex && (
        <>
          <Grid
            nodeId={nodeId}
            cols={1}
            defs={[
              {
                prop: 'flex-direction',
                label: 'Direction',
                type: 'segmented',
                options: [
                  { value: 'row', label: '→' },
                  { value: 'column', label: '↓' },
                  { value: 'row-reverse', label: '←' },
                  { value: 'column-reverse', label: '↑' },
                ],
              },
            ]}
          />
          <Grid
            nodeId={nodeId}
            defs={[
              { prop: 'justify-content', label: 'Justify', type: 'select', options: JUSTIFY },
              { prop: 'align-items', label: 'Align', type: 'select', options: ALIGN },
              { prop: 'gap', label: 'Gap', type: 'length', min: 0 },
              { prop: 'flex-wrap', label: 'Wrap', type: 'select', options: opts('nowrap', 'wrap', 'wrap-reverse') },
            ]}
          />
        </>
      )}
      {isGrid && (
        <Grid
          nodeId={nodeId}
          defs={[
            { prop: 'grid-template-columns', label: 'Columns', type: 'text', mono: true, placeholder: '1fr 1fr' },
            { prop: 'grid-template-rows', label: 'Rows', type: 'text', mono: true, placeholder: 'auto' },
            { prop: 'gap', label: 'Gap', type: 'length', min: 0 },
            { prop: 'place-items', label: 'Place items', type: 'select', options: opts('start', 'center', 'end', 'stretch') },
          ]}
        />
      )}
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'flex-grow', label: 'Grow', type: 'number', min: 0 },
          { prop: 'flex-shrink', label: 'Shrink', type: 'number', min: 0 },
          { prop: 'align-self', label: 'Align self', type: 'select', options: ['auto', ...ALIGN] },
          { prop: 'order', label: 'Order', type: 'number' },
        ]}
      />
    </Section>
  );
}

export function SizeSection({ nodeId }: { nodeId: string }) {
  const sizeUnits = ['px', '%', 'vw', 'vh', 'em', 'rem', 'auto', 'fit-content', 'min-content', 'max-content'];
  return (
    <Section title="Size">
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'width', label: 'Width', type: 'length', icon: 'W', units: sizeUnits, min: 0 },
          { prop: 'height', label: 'Height', type: 'length', icon: 'H', units: sizeUnits, min: 0 },
          { prop: 'min-width', label: 'Min W', type: 'length', min: 0 },
          { prop: 'max-width', label: 'Max W', type: 'length', min: 0, units: [...sizeUnits, 'none'] },
          { prop: 'min-height', label: 'Min H', type: 'length', min: 0 },
          { prop: 'max-height', label: 'Max H', type: 'length', min: 0, units: [...sizeUnits, 'none'] },
          { prop: 'overflow', label: 'Overflow', type: 'select', options: OVERFLOW },
          { prop: 'aspect-ratio', label: 'Aspect ratio', type: 'text', placeholder: 'auto' },
        ]}
      />
    </Section>
  );
}

function BoxSides({ nodeId, prop, label }: { nodeId: string; prop: 'padding' | 'margin'; label: string }) {
  const units = prop === 'margin' ? ['px', '%', 'em', 'rem', 'vh', 'vw', 'auto'] : ['px', '%', 'em', 'rem', 'vh', 'vw'];
  return (
    <div className="inspector-box">
      <div className="inspector-box__label">{label}</div>
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: `${prop}-top`, label: 'Top', type: 'length', icon: '↑', units, min: prop === 'padding' ? 0 : undefined },
          { prop: `${prop}-right`, label: 'Right', type: 'length', icon: '→', units, min: prop === 'padding' ? 0 : undefined },
          { prop: `${prop}-bottom`, label: 'Bottom', type: 'length', icon: '↓', units, min: prop === 'padding' ? 0 : undefined },
          { prop: `${prop}-left`, label: 'Left', type: 'length', icon: '←', units, min: prop === 'padding' ? 0 : undefined },
        ]}
      />
    </div>
  );
}

export function SpacingSection({ nodeId }: { nodeId: string }) {
  return (
    <Section title="Spacing">
      <BoxSides nodeId={nodeId} prop="padding" label="Padding" />
      <BoxSides nodeId={nodeId} prop="margin" label="Margin" />
    </Section>
  );
}

export function PositionSection({ nodeId }: { nodeId: string }) {
  const position = useResolvedProp(nodeId, 'position');
  const offset = position && position !== 'static';
  return (
    <Section title="Position" defaultOpen={false}>
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'position', label: 'Position', type: 'select', options: POSITION },
          { prop: 'z-index', label: 'Z index', type: 'number' },
        ]}
      />
      {offset && (
        <Grid
          nodeId={nodeId}
          defs={[
            { prop: 'top', label: 'Top', type: 'length' },
            { prop: 'right', label: 'Right', type: 'length' },
            { prop: 'bottom', label: 'Bottom', type: 'length' },
            { prop: 'left', label: 'Left', type: 'length' },
          ]}
        />
      )}
    </Section>
  );
}

export function TypographySection({ nodeId }: { nodeId: string }) {
  return (
    <Section title="Typography">
      <Grid
        nodeId={nodeId}
        cols={1}
        defs={[{ prop: 'font-family', label: 'Font', type: 'text', list: 'font-families', placeholder: 'Inherit' }]}
      />
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'font-size', label: 'Size', type: 'length', units: TEXT_UNITS, min: 0 },
          { prop: 'font-weight', label: 'Weight', type: 'select', options: WEIGHTS },
          { prop: 'line-height', label: 'Line height', type: 'length', units: LINE_HEIGHT_UNITS, defaultUnit: '' },
          { prop: 'letter-spacing', label: 'Letter spacing', type: 'length', units: ['px', 'em'] },
        ]}
      />
      <Grid nodeId={nodeId} cols={1} defs={[{ prop: 'color', label: 'Color', type: 'color' }]} />
      <Grid
        nodeId={nodeId}
        cols={1}
        defs={[
          {
            prop: 'text-align',
            label: 'Align',
            type: 'segmented',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
              { value: 'justify', label: 'Justify' },
            ],
          },
        ]}
      />
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'text-transform', label: 'Case', type: 'select', options: opts('none', 'uppercase', 'lowercase', 'capitalize') },
          { prop: 'text-decoration', label: 'Decoration', type: 'select', options: opts('none', 'underline', 'line-through') },
          { prop: 'white-space', label: 'White space', type: 'select', options: opts('normal', 'nowrap', 'pre', 'pre-wrap') },
          { prop: 'font-style', label: 'Style', type: 'select', options: opts('normal', 'italic') },
        ]}
      />
    </Section>
  );
}

export function FillSection({ nodeId }: { nodeId: string }) {
  return (
    <Section title="Fill">
      <Grid
        nodeId={nodeId}
        cols={1}
        defs={[
          { prop: 'background-color', label: 'Background', type: 'color' },
          { prop: 'background-image', label: 'Image / gradient', type: 'text', mono: true, placeholder: 'none' },
        ]}
      />
    </Section>
  );
}

export function BorderSection({ nodeId }: { nodeId: string }) {
  return (
    <Section title="Border">
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'border-width', label: 'Width', type: 'length', min: 0, units: ['px', 'em', 'rem'] },
          { prop: 'border-style', label: 'Style', type: 'select', options: BORDER_STYLE },
        ]}
      />
      <Grid nodeId={nodeId} cols={1} defs={[{ prop: 'border-color', label: 'Color', type: 'color' }]} />
      <div className="inspector-box">
        <div className="inspector-box__label">Radius</div>
        <Grid
          nodeId={nodeId}
          defs={[
            { prop: 'border-top-left-radius', label: 'Top left', type: 'length', icon: '┌', min: 0 },
            { prop: 'border-top-right-radius', label: 'Top right', type: 'length', icon: '┐', min: 0 },
            { prop: 'border-bottom-left-radius', label: 'Bottom left', type: 'length', icon: '└', min: 0 },
            { prop: 'border-bottom-right-radius', label: 'Bottom right', type: 'length', icon: '┘', min: 0 },
          ]}
        />
      </div>
    </Section>
  );
}

export function EffectsSection({ nodeId }: { nodeId: string }) {
  return (
    <Section title="Effects">
      <Grid
        nodeId={nodeId}
        defs={[
          { prop: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
          { prop: 'cursor', label: 'Cursor', type: 'select', options: CURSOR },
        ]}
      />
      <Grid
        nodeId={nodeId}
        cols={1}
        defs={[
          { prop: 'transform', label: 'Transform', type: 'text', mono: true, placeholder: 'none' },
          { prop: 'transform-origin', label: 'Transform origin', type: 'text', mono: true, placeholder: 'center' },
          { prop: 'box-shadow', label: 'Shadow', type: 'text', mono: true, placeholder: 'none' },
          { prop: 'filter', label: 'Filter', type: 'text', mono: true, placeholder: 'none' },
          { prop: 'backdrop-filter', label: 'Backdrop filter', type: 'text', mono: true, placeholder: 'none' },
        ]}
      />
    </Section>
  );
}
