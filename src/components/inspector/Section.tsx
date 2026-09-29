import { useState, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

const openState = new Map<string, boolean>();

interface SectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
}

/** Collapsible inspector section. Open/closed is remembered per title for the session. */
export function Section({ title, children, defaultOpen = true, actions }: SectionProps) {
  const [open, setOpen] = useState(openState.get(title) ?? defaultOpen);
  return (
    <section className={`inspector-section${open ? ' is-open' : ''}`}>
      <header className="inspector-section__header">
        <button
          type="button"
          className="ui-reset-button inspector-section__toggle"
          onClick={() => {
            openState.set(title, !open);
            setOpen(!open);
          }}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} />
          {title}
        </button>
        {actions}
      </header>
      {open && <div className="inspector-section__body">{children}</div>}
    </section>
  );
}
