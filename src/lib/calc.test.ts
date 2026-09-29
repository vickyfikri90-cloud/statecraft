import { describe, expect, it } from 'vitest';
import { evaluateValue, parseDimension } from './calc';

describe('evaluateValue', () => {
  it.each([
    ['100/2', 'px', '50px'],
    ['100/2', '', '50'],
    ['12px*2', 'px', '24px'],
    ['2*(10+5)', 'px', '30px'],
    ['-8 + 2', 'px', '-6px'],
    ['50vh', 'px', '50vh'],
    ['100vw/4', 'px', '25vw'],
    ['0', 'px', '0'],
    ['1.5', '', '1.5'],
    ['10/3', 'px', '3.333px'],
    ['auto', 'px', 'auto'],
    ['fit-content', 'px', 'fit-content'],
    ['#ff0000', '', '#ff0000'],
    ['calc(100% - 4px)', 'px', 'calc(100% - 4px)'],
  ])('%s (default %s) → %s', (input, unit, expected) => {
    expect(evaluateValue(input, unit)).toBe(expected);
  });

  it('wraps mixed units in calc()', () => {
    expect(evaluateValue('100% - 24px', 'px')).toBe('calc(100% - 24px)');
    expect(evaluateValue('(100vw - 2rem)/2', 'px')).toBe('calc((100vw - 2rem) / 2)');
  });

  it('rejects garbage', () => {
    expect(evaluateValue('10 +', 'px')).toBeNull();
    expect(evaluateValue('5/0', 'px')).toBeNull();
    expect(evaluateValue('((2)', 'px')).toBeNull();
  });
});

describe('parseDimension', () => {
  it('parses number + unit', () => {
    expect(parseDimension('12px')).toEqual({ num: 12, unit: 'px' });
    expect(parseDimension('-0.5em')).toEqual({ num: -0.5, unit: 'em' });
    expect(parseDimension('auto')).toBeNull();
  });
});
