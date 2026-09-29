/**
 * Local file access. Uses the File System Access API (Chrome, Edge, Arc) so
 * "Save" writes back to the same file; falls back to download / file input.
 */

export interface FileTypeSpec {
  description: string;
  mime: string;
  extensions: string[];
}

// Minimal typings for the File System Access API (not in lib.dom yet).
interface FsWritable {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}
export interface FsFileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FsWritable>;
}
interface PickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
}
type FsWindow = Window & {
  showOpenFilePicker?: (o?: PickerOptions) => Promise<FsFileHandle[]>;
  showSaveFilePicker?: (o?: PickerOptions) => Promise<FsFileHandle>;
};

const fsWindow = window as FsWindow;
export const supportsFileSystemAccess = typeof fsWindow.showSaveFilePicker === 'function';

const pickerTypes = (t: FileTypeSpec) => [{ description: t.description, accept: { [t.mime]: t.extensions } }];

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export interface OpenedFile {
  name: string;
  text: string;
  handle: FsFileHandle | null;
}

export async function openTextFile(type: FileTypeSpec): Promise<OpenedFile | null> {
  if (fsWindow.showOpenFilePicker) {
    try {
      const [handle] = await fsWindow.showOpenFilePicker({ types: pickerTypes(type) });
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (err) {
      if (isAbortError(err)) return null;
      throw err;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type.extensions.join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { name: file.name, text: await file.text(), handle: null } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Write to `handle` when given; otherwise ask for a location.
 * Returns the handle written to (null when downloaded or cancelled) and whether it saved.
 */
export async function saveTextFile(
  text: string,
  type: FileTypeSpec,
  suggestedName: string,
  handle: FsFileHandle | null,
): Promise<{ saved: boolean; handle: FsFileHandle | null; name: string }> {
  if (!handle && fsWindow.showSaveFilePicker) {
    try {
      handle = await fsWindow.showSaveFilePicker({ suggestedName, types: pickerTypes(type) });
    } catch (err) {
      if (isAbortError(err)) return { saved: false, handle: null, name: suggestedName };
      throw err;
    }
  }
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return { saved: true, handle, name: handle.name };
  }
  downloadText(text, suggestedName, type.mime);
  return { saved: true, handle: null, name: suggestedName };
}

export function downloadText(text: string, filename: string, mime = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
