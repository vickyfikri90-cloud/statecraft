import type { NodeTag } from '../../model/types';
import { useEditor } from '../../store/editor';
import { Field, Select, TextInput } from '../ui/controls';
import { Section } from './Section';

const CONTAINER_TAGS: NodeTag[] = ['div', 'section', 'button', 'a', 'label', 'span', 'p', 'h1', 'h2', 'h3'];
const VOID_TAGS: NodeTag[] = ['img', 'input'];

export function ElementSection({ nodeId }: { nodeId: string }) {
  const node = useEditor((s) => s.doc.nodes[nodeId]);
  const edit = useEditor((s) => s.edit);
  if (!node) return null;

  const setNode = (patch: Partial<typeof node>, coalesce?: string) =>
    edit((d) => Object.assign(d.nodes[nodeId], patch), { coalesce });
  const setAttr = (key: string, value: string) =>
    edit((d) => {
      const n = d.nodes[nodeId];
      n.attrs = { ...n.attrs, [key]: value };
    });

  const tags = node.children.length ? CONTAINER_TAGS : [...CONTAINER_TAGS, ...VOID_TAGS];
  const isVoid = VOID_TAGS.includes(node.tag);

  const uploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setAttr('src', String(reader.result));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <Section title="Element">
      <div className="inspector-grid is-cols-2">
        <Field label="Name">
          <TextInput value={node.name} onChange={(name) => name.trim() && setNode({ name: name.trim() })} />
        </Field>
        <Field label="Tag">
          <Select
            value={node.tag}
            options={tags}
            onChange={(tag) =>
              edit((d) => {
                const n = d.nodes[nodeId];
                n.tag = tag as NodeTag;
                if (tag === 'img') n.attrs = { src: 'https://picsum.photos/320/200', alt: '', ...n.attrs };
                if (tag === 'input') n.attrs = { type: 'text', placeholder: n.text ?? '', ...n.attrs };
              })
            }
          />
        </Field>
      </div>
      <div className="inspector-grid is-cols-1">
        {!isVoid && !node.children.length && (
          <Field label="Text">
            <TextInput multiline live value={node.text ?? ''} onChange={(text, o) => setNode({ text }, o?.coalesce && `text:${nodeId}`)} />
          </Field>
        )}
        {node.tag === 'img' && (
          <>
            <Field label="Source">
              <TextInput value={node.attrs?.src?.startsWith('data:') ? '(uploaded image)' : (node.attrs?.src ?? '')} onChange={(v) => setAttr('src', v)} />
              <button type="button" className="ui-reset-button ui-button is-small" onClick={uploadImage}>
                Upload
              </button>
            </Field>
            <Field label="Alt text">
              <TextInput value={node.attrs?.alt ?? ''} onChange={(v) => setAttr('alt', v)} />
            </Field>
          </>
        )}
        {node.tag === 'input' && (
          <>
            <Field label="Placeholder">
              <TextInput value={node.attrs?.placeholder ?? ''} onChange={(v) => setAttr('placeholder', v)} />
            </Field>
            <Field label="Type">
              <Select
                value={node.attrs?.type ?? 'text'}
                options={['text', 'email', 'password', 'number', 'search', 'checkbox', 'range']}
                onChange={(v) => setAttr('type', v)}
              />
            </Field>
          </>
        )}
        {node.tag === 'a' && (
          <Field label="Link">
            <TextInput value={node.attrs?.href ?? ''} placeholder="https://" onChange={(v) => setAttr('href', v)} />
          </Field>
        )}
      </div>
    </Section>
  );
}
