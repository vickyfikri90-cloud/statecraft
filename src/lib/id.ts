export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'el'
  );
}
