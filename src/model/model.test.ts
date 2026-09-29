import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { buildEditorCss, buildExportCss, buildExportHtml } from './css';
import { FileFormatError, parse, serialize } from './file-format';
import { TEMPLATES } from './templates';
import { duplicateNode, moveNode, NODE_PRESETS, insertNode, removeNode, unwrap, wrapInDiv } from './tree';

const template = (id: string) => TEMPLATES.find((t) => t.id === id)!.create();
const byName = (doc: ReturnType<typeof template>, name: string) =>
  Object.values(doc.nodes).find((n) => n.name === name)!.id;

describe('tree operations', () => {
  it('wraps a child in a div and unwraps it again', () => {
    const doc = template('button');
    const label = byName(doc, 'Label');
    const wrapped = produce(doc, (d) => void wrapInDiv(d, label));
    const wrapper = wrapped.nodes[label].parentId!;
    expect(wrapped.nodes[wrapper].tag).toBe('div');
    expect(wrapped.nodes[doc.rootId].children[0]).toBe(wrapper);

    const back = produce(wrapped, (d) => void unwrap(d, wrapper));
    expect(back.nodes[doc.rootId].children).toEqual(doc.nodes[doc.rootId].children);
    expect(back.nodes[wrapper]).toBeUndefined();
  });

  it('wrapping the root makes the wrapper the new root', () => {
    const doc = template('button');
    const next = produce(doc, (d) => void wrapInDiv(d, d.rootId));
    expect(next.rootId).not.toBe(doc.rootId);
    expect(next.nodes[next.rootId].children).toEqual([doc.rootId]);
  });

  it('moves nodes and refuses cycles', () => {
    const doc = template('card');
    const body = byName(doc, 'Body');
    const media = byName(doc, 'Media');
    const title = byName(doc, 'Title');
    const moved = produce(doc, (d) => void moveNode(d, title, doc.rootId, 0));
    expect(moved.nodes[doc.rootId].children[0]).toBe(title);
    expect(moved.nodes[body].children).not.toContain(title);

    const cyclic = produce(doc, (d) => void moveNode(d, doc.rootId, media, 0));
    expect(cyclic).toBe(doc);
  });

  it('removes a subtree with its styles in every state', () => {
    const doc = template('card');
    const media = byName(doc, 'Media');
    const image = byName(doc, 'Image');
    const next = produce(doc, (d) => removeNode(d, media));
    expect(next.nodes[image]).toBeUndefined();
    for (const byNode of Object.values(next.styles)) expect(byNode[image]).toBeUndefined();
  });

  it('duplicates with styles', () => {
    const doc = template('button');
    const arrow = byName(doc, 'Arrow');
    let copy = '';
    const next = produce(doc, (d) => {
      copy = duplicateNode(d, arrow)!;
    });
    const hover = doc.states[1].id;
    expect(next.styles[hover][copy]).toEqual(doc.styles[hover][arrow]);
  });

  it('inserts a child with default styles', () => {
    const doc = template('blank');
    const next = produce(doc, (d) => void insertNode(d, NODE_PRESETS.text, d.rootId));
    expect(next.nodes[doc.rootId].children).toHaveLength(1);
  });
});

describe('css', () => {
  it('builds forced and live selectors', () => {
    const doc = template('button');
    const css = buildEditorCss(doc);
    const hover = doc.states[1].id;
    expect(css).toContain(`.sc-canvas[data-state="${hover}"] .n-${doc.rootId}`);
    expect(css).toContain(`.sc-canvas[data-state="live"] .n-${doc.rootId}:hover`);
  });

  it('uses :has() when the target is outside the trigger subtree', () => {
    const doc = template('input');
    const css = buildExportCss(doc);
    expect(css).toContain('body:has(.input:focus) .label');
  });

  it('exports custom states as classes', () => {
    const doc = template('toggle');
    expect(buildExportCss(doc)).toContain('.track.is-on .knob');
    expect(buildExportHtml(doc)).toBe('<div class="track">\n  <div class="knob"></div>\n</div>');
  });
});

describe('file format', () => {
  it('round-trips a document', () => {
    const doc = template('card');
    expect(parse(serialize(doc))).toEqual(doc);
  });

  it('rejects foreign files', () => {
    expect(() => parse('{"hello": 1}')).toThrow(FileFormatError);
    expect(() => parse('nope')).toThrow(FileFormatError);
    expect(() => parse(JSON.stringify({ format: 'statecraft', version: 99, document: {} }))).toThrow(/version/);
  });
});
