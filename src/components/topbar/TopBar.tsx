import { useState } from 'react';
import { selectIsDirty, useEditor } from '../../store/editor';
import { exportHtml, importHtmlFile, openComponent, saveComponent } from '../../store/file-actions';
import { Icon } from '../ui/Icon';
import { Menu, anchorBelow, type MenuItem } from '../ui/Menu';
import './topbar.css';

interface TopBarProps {
  onNew: () => void;
  onShowCode: () => void;
}

export function TopBar({ onNew, onShowCode }: TopBarProps) {
  const name = useEditor((s) => s.doc.name);
  const fileName = useEditor((s) => s.file?.name);
  const dirty = useEditor(selectIsDirty);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const selectMode = useEditor((s) => s.selectMode);
  const { undo, redo, setSelectMode, edit } = useEditor.getState();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [editingName, setEditingName] = useState(false);

  const fileItems: MenuItem[] = [
    { label: 'New component…', shortcut: '⌥N', onSelect: onNew },
    { label: 'Open…', shortcut: '⌘O', onSelect: openComponent },
    { label: 'Import HTML…', shortcut: '⇧⌘O', onSelect: importHtmlFile },
    { type: 'separator' },
    { label: 'Save', shortcut: '⌘S', onSelect: () => saveComponent() },
    { label: 'Save as…', shortcut: '⇧⌘S', onSelect: () => saveComponent({ saveAs: true }) },
    { type: 'separator' },
    { label: 'View code…', shortcut: '⌘E', onSelect: onShowCode },
    { label: 'Export HTML', onSelect: exportHtml },
  ];

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__logo" aria-hidden>
          SC
        </div>
        <button
          type="button"
          className="ui-reset-button topbar__menu-button"
          onClick={(e) => setMenu(anchorBelow(e.currentTarget))}
        >
          File
          <Icon name="chevronDown" size={12} />
        </button>
        <div className="topbar__divider" />
        <button
          type="button"
          className={`ui-reset-button topbar__tool${selectMode ? ' is-active' : ''}`}
          title="Select element (V)"
          aria-pressed={selectMode}
          onClick={() => setSelectMode(!selectMode)}
        >
          <Icon name="cursor" />
          <span>Select element</span>
        </button>
      </div>

      <div className="topbar__center">
        {editingName ? (
          <input
            className="topbar__name-input"
            autoFocus
            defaultValue={name}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v && v !== name) edit((d) => void (d.name = v));
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <button type="button" className="ui-reset-button topbar__name" onClick={() => setEditingName(true)}>
            {name}
          </button>
        )}
        <span className="topbar__file">
          {dirty && <span className="topbar__dirty" title="Unsaved changes" />}
          {fileName ?? 'Not saved'}
        </span>
      </div>

      <div className="topbar__right">
        <button type="button" className="ui-reset-button topbar__icon" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
          <Icon name="undo" />
        </button>
        <button type="button" className="ui-reset-button topbar__icon" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}>
          <Icon name="redo" />
        </button>
        <div className="topbar__divider" />
        <button type="button" className="ui-reset-button ui-button" onClick={onShowCode}>
          <Icon name="code" size={14} />
          Code
        </button>
        <button type="button" className="ui-reset-button ui-button is-primary" onClick={() => saveComponent()}>
          Save
        </button>
      </div>
      {menu && <Menu x={menu.x} y={menu.y} onClose={() => setMenu(null)} items={fileItems} minWidth={200} />}
    </header>
  );
}
