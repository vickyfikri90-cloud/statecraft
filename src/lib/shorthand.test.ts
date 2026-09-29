import { describe, expect, it } from 'vitest';
import { patchProp, readProp } from './shorthand';

describe('readProp', () => {
  it('derives longhands from shorthands', () => {
    expect(readProp({ padding: '8px 16px' }, 'padding-left')).toBe('16px');
    expect(readProp({ padding: '8px 16px' }, 'padding-bottom')).toBe('8px');
    expect(readProp({ 'border-radius': '4px' }, 'border-top-left-radius')).toBe('4px');
    expect(readProp({ border: '1px solid rgba(0, 0, 0, 0.1)' }, 'border-color')).toBe('rgba(0, 0, 0, 0.1)');
    expect(readProp({ border: '2px solid red' }, 'border-top-width')).toBe('2px');
    expect(readProp({ 'padding-left': '3px', padding: '8px' }, 'padding-left')).toBe('3px');
  });
});

describe('patchProp', () => {
  it('expands a shorthand before setting a longhand', () => {
    expect(patchProp({ padding: '8px 16px' }, 'padding-top', '4px')).toEqual({
      padding: '',
      'padding-top': '4px',
      'padding-right': '16px',
      'padding-bottom': '8px',
      'padding-left': '16px',
    });
  });

  it('clears longhands when setting the shorthand', () => {
    expect(patchProp({ 'padding-top': '1px', color: 'red' }, 'padding', '2px')).toEqual({
      'padding-top': '',
      padding: '2px',
    });
  });

  it('sets plain props', () => {
    expect(patchProp({}, 'color', 'red')).toEqual({ color: 'red' });
  });
});
