import { describe, expect, it } from 'vitest';
import { parseDeclarations, specificity, splitAtPseudo, splitSelectorList } from './import-html';

// importHtml() itself needs a browser DOM; these cover the pure parsing helpers.

describe('parseDeclarations', () => {
  it('splits on top-level semicolons only', () => {
    expect(parseDeclarations('padding: 4px 8px; background: url("a;b.png") no-repeat; --Gap: 2px')).toEqual({
      padding: '4px 8px',
      background: 'url("a;b.png") no-repeat',
      '--Gap': '2px',
    });
  });

  it('folds expanded border longhands back into `border`', () => {
    const expanded = 'padding: 1px; border-width: medium; border-style: none; border-color: currentcolor; border-image: none;';
    expect(parseDeclarations(expanded)).toEqual({ padding: '1px', border: 'none' });
    expect(parseDeclarations('border-width: 1px; border-style: solid; border-color: red; border-image: initial')).toEqual({
      border: '1px solid red',
    });
  });
});

describe('splitSelectorList', () => {
  it('ignores commas inside parentheses', () => {
    expect(splitSelectorList('.a, .b:is(.c, .d) > span')).toEqual(['.a', '.b:is(.c, .d) > span']);
  });
});

describe('splitAtPseudo', () => {
  const hover = /:hover\b/;
  it('finds the trigger compound', () => {
    expect(splitAtPseudo('.card:hover .title', hover)).toEqual({ trigger: '.card', full: '.card .title' });
    expect(splitAtPseudo('button.primary:hover', hover)).toEqual({ trigger: 'button.primary', full: 'button.primary' });
    expect(splitAtPseudo('.a:hover.b > .c', hover)).toEqual({ trigger: '.a.b', full: '.a.b > .c' });
  });

  it('rejects a bare pseudo-class', () => {
    expect(splitAtPseudo(':hover', hover)).toBeNull();
    expect(splitAtPseudo('.list :hover', hover)).toBeNull();
  });
});

describe('specificity', () => {
  it('orders ids > classes > types', () => {
    expect(specificity('#a')).toBeGreaterThan(specificity('.a.b.c'));
    expect(specificity('.a')).toBeGreaterThan(specificity('div span'));
    expect(specificity('div.a')).toBeGreaterThan(specificity('.a'));
  });
});
