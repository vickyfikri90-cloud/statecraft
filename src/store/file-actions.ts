import { downloadText, openTextFile, saveTextFile, type FileTypeSpec } from '../lib/fs';
import { slugify } from '../lib/id';
import { buildExportDocument } from '../model/css';
import { FILE_EXTENSION, FILE_MIME, FileFormatError, parse, serialize } from '../model/file-format';
import { importHtml } from '../model/import-html';
import { confirmDialog } from '../components/dialogs/Confirm';
import type { Template } from '../model/templates';
import { selectIsDirty, useEditor } from './editor';

const SC_FILE: FileTypeSpec = { description: 'Statecraft component', mime: FILE_MIME, extensions: [FILE_EXTENSION] };
const HTML: FileTypeSpec = { description: 'HTML page', mime: 'text/html', extensions: ['.html', '.htm'] };
const AUTOSAVE_KEY = 'statecraft:autosave';

const store = () => useEditor.getState();

export async function confirmDiscard(): Promise<boolean> {
  if (!selectIsDirty(store())) return true;
  return confirmDialog('Unsaved changes', `Discard your changes to "${store().doc.name}"?`, 'Discard');
}

export async function newFromTemplate(template: Template): Promise<boolean> {
  if (!(await confirmDiscard())) return false;
  // A fresh template has nothing to lose, so it starts "clean" but without a file.
  store().loadDoc(template.create(), null);
  return true;
}

export async function openComponent(): Promise<void> {
  if (!(await confirmDiscard())) return;
  try {
    const opened = await openTextFile(SC_FILE);
    if (!opened) return;
    const doc = parse(opened.text);
    store().loadDoc(doc, { name: opened.name, handle: opened.handle });
    store().notify(`Opened ${opened.name}`);
  } catch (err) {
    store().notify(err instanceof FileFormatError ? err.message : 'Could not open file.', 'error');
    console.error(err);
  }
}

/** Turn an .html file into a new, unsaved component. */
export async function importHtmlFile(): Promise<void> {
  if (!(await confirmDiscard())) return;
  try {
    const opened = await openTextFile(HTML);
    if (!opened) return;
    const { doc, report } = importHtml(opened.text, opened.name.replace(/\.html?$/i, ''));
    store().loadDoc(doc, null, { saved: false });
    const skipped = [
      report.skipped.media && `${report.skipped.media} @media`,
      report.skipped.pseudoElements && `${report.skipped.pseudoElements} ::before/::after`,
      report.skipped.unsupportedSelectors && `${report.skipped.unsupportedSelectors} selectors`,
      report.skipped.scripts && `${report.skipped.scripts} scripts`,
    ].filter(Boolean);
    store().notify(
      `Imported ${report.elements} layers, ${report.states} states` + (skipped.length ? ` · skipped ${skipped.join(', ')}` : ''),
    );
  } catch (err) {
    store().notify('Could not import this HTML file.', 'error');
    console.error(err);
  }
}

export async function saveComponent(opts: { saveAs?: boolean } = {}): Promise<void> {
  const { doc, file } = store();
  const handle = opts.saveAs ? null : (file?.handle ?? null);
  const suggested = `${slugify(doc.name)}${FILE_EXTENSION}`;
  try {
    const result = await saveTextFile(serialize(doc), SC_FILE, suggested, handle);
    if (!result.saved) return;
    store().markSaved({ name: result.name, handle: result.handle });
    store().notify(`Saved ${result.name}`);
  } catch (err) {
    store().notify('Could not save file.', 'error');
    console.error(err);
  }
}

export function exportHtml(): void {
  const { doc } = store();
  downloadText(buildExportDocument(doc), `${slugify(doc.name)}.html`, 'text/html');
}

// ---------------------------------------------------------------------------
// Crash recovery: the working doc is mirrored to localStorage.
// ---------------------------------------------------------------------------

export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    const { text, fileName, dirty } = JSON.parse(raw) as { text: string; fileName: string | null; dirty: boolean };
    const doc = parse(text);
    store().loadDoc(doc, fileName ? { name: fileName, handle: null } : null, { saved: !dirty });
    return true;
  } catch {
    return false;
  }
}

export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useEditor.subscribe((state, prev) => {
    if (state.doc === prev.doc && state.savedDoc === prev.savedDoc) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const s = store();
        localStorage.setItem(
          AUTOSAVE_KEY,
          JSON.stringify({ text: serialize(s.doc), fileName: s.file?.name ?? null, dirty: selectIsDirty(s) }),
        );
      } catch {
        // Storage full or blocked: recovery is best-effort.
      }
    }, 400);
  });
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (selectIsDirty(store())) e.preventDefault();
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => {
    unsubscribe();
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}
