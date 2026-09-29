const PATHS = {
  cursor: 'M4 3l8.5 4.2-3.6 1.1L7.6 12z',
  undo: 'M5 7H10a3 3 0 010 6H8M5 7l2.5-2.5M5 7l2.5 2.5',
  redo: 'M11 7H6a3 3 0 000 6h2M11 7L8.5 4.5M11 7l-2.5 2.5',
  plus: 'M8 3.5v9M3.5 8h9',
  close: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
  chevronRight: 'M6.5 4.5L10 8l-3.5 3.5',
  chevronDown: 'M4.5 6.5L8 10l3.5-3.5',
  more: 'M4 8h.01M8 8h.01M12 8h.01',
  frame: 'M3.5 3.5h9v9h-9z',
  text: 'M4 4.5h8M8 4.5v8',
  button: 'M2.5 5.5h11v5h-11z',
  image: 'M3 3.5h10v9H3zM3 10.5l3-3 3 3 1.5-1.5L13 11.5',
  input: 'M2.5 5h11v6h-11zM5 7v2',
  reset: 'M4 8a4 4 0 104-4H6M6 2.5L4.5 4 6 5.5',
  code: 'M6 5L3 8l3 3M10 5l3 3-3 3',
  play: 'M5.5 4v8l6-4z',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8zM8 9.75a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z',
  file: 'M4 2.5h5l3 3v8H4zM9 2.5v3h3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 2.2 : 1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
