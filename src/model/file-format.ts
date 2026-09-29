/**
 * `.statecraft` — the Statecraft file format.
 *
 * A JSON envelope around an ComponentDoc:
 * {
 *   "format": "statecraft",
 *   "version": 1,
 *   "savedAt": "<ISO date>",
 *   "document": ComponentDoc
 * }
 */
import { DEFAULT_STATE_ID, type ComponentDoc } from './types';

export const FILE_EXTENSION = '.statecraft';
export const FILE_MIME = 'application/x-statecraft+json';
export const FORMAT_ID = 'statecraft';
export const FORMAT_VERSION = 1;

interface Envelope {
  format: typeof FORMAT_ID;
  version: number;
  savedAt: string;
  document: ComponentDoc;
}

export class FileFormatError extends Error {}

export function serialize(doc: ComponentDoc): string {
  const envelope: Envelope = {
    format: FORMAT_ID,
    version: FORMAT_VERSION,
    savedAt: new Date().toISOString(),
    document: doc,
  };
  return JSON.stringify(envelope, null, 2);
}

export function parse(text: string): ComponentDoc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new FileFormatError('File is not valid JSON.');
  }
  if (!isObject(data) || data.format !== FORMAT_ID) {
    throw new FileFormatError('Not a Statecraft (.statecraft) file.');
  }
  if (typeof data.version !== 'number' || data.version > FORMAT_VERSION) {
    throw new FileFormatError(`Unsupported file version ${String(data.version)}. Update the app.`);
  }
  const doc = migrate(data.version, data.document);
  validate(doc);
  return doc;
}

/** Upgrade older documents. Add a case per version bump. */
function migrate(_version: number, doc: unknown): ComponentDoc {
  return doc as ComponentDoc;
}

function validate(doc: ComponentDoc): void {
  const fail = (msg: string) => {
    throw new FileFormatError(`Corrupt file: ${msg}`);
  };
  if (!isObject(doc)) fail('missing document');
  if (!isObject(doc.nodes) || !doc.nodes[doc.rootId]) fail('root node not found');
  if (!Array.isArray(doc.states) || doc.states[0]?.id !== DEFAULT_STATE_ID) fail('default state missing');
  if (!isObject(doc.styles)) fail('styles missing');
  for (const node of Object.values(doc.nodes)) {
    for (const c of node.children) if (!doc.nodes[c]) fail(`dangling child ${c}`);
  }
  for (const state of doc.states) {
    doc.styles[state.id] ??= {};
    if (!doc.nodes[state.triggerId]) state.triggerId = doc.rootId;
  }
  doc.canvas ??= { background: '#f4f4f5' };
}

function isObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null;
}
