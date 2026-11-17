/**
 * Copyright (C) 2026 SailPoint Technologies, Inc.  All rights reserved.
 */
import { getAdjustedColor, isValidHex } from '../../../src/design-system-theme/color/color';

describe('SPDS color helpers', () => {
	describe('isValidHex()', () => {
		it.each(['#ABC', '#abc', '#0033A1', '#0033a1', '#000', '#fff', '#000000', '#ffffff'])(
			'should accept %s',
			(hex: string) => {
				expect(isValidHex(hex)).toBe(true);
			}
		);

		it.each([
			['an empty string', ''],
			['a missing hash', 'ABC'],
			['a missing hash on a six-digit value', '0033A1'],
			['a non-hex character', '#GGG'],
			['a two-digit value', '#00'],
			['a four-digit value', '#0033'],
			['a five-digit value', '#0033A'],
			['a four-digit alpha value', '#RGBA'],
			['an eight-digit alpha value', '#0033A1BF'],
			['a named color', 'red'],
			['a CSS function', 'rgb(1,2,3)'],
			['leading whitespace', ' #fff'],
			['trailing whitespace', '#fff '],
			['appended CSS', '#fff;background:url(x)'],
			['a trailing character', '#ffffffx']
		])('should reject %s', (_label: string, hex: string) => {
			expect(isValidHex(hex)).toBe(false);
		});
	});

	describe('getAdjustedColor()', () => {
		it('should lighten and darken a six-digit hex using HSL math', () => {
			expect(getAdjustedColor('#0074D9', 10, true)).toBe('#0d8eff');
			expect(getAdjustedColor('#0074D9', 10, false)).toBe('#0058a6');
		});

		it('should add a missing hash before validating adjustment input', () => {
			expect(getAdjustedColor('0074D9', 10, true)).toBe('#0d8eff');
			expect(getAdjustedColor('abc', 10, true)).toBe('#c9d4df');
		});

		it('should return a lowercase six-digit hex for uppercase and three-digit input', () => {
			expect(getAdjustedColor('#ABC', 10, true)).toBe('#c9d4df');
			expect(getAdjustedColor('#abc', 10, false)).toBe('#8aa1b8');
		});

		it('should clamp lightened white and darkened black, including three-digit boundaries', () => {
			expect(getAdjustedColor('#ffffff', 10, true)).toBe('#ffffff');
			expect(getAdjustedColor('#fff', 10, true)).toBe('#ffffff');
			expect(getAdjustedColor('#000000', 10, false)).toBe('#000000');
			expect(getAdjustedColor('#000', 10, false)).toBe('#000000');
		});

		it('should lighten and darken red, green, blue, and purple hex values', () => {
			expect(getAdjustedColor('#ff0000', 10, true)).toBe('#ff3232');
			expect(getAdjustedColor('#ff0000', 10, false)).toBe('#cc0000');
			expect(getAdjustedColor('#00ff00', 10, true)).toBe('#33ff32');
			expect(getAdjustedColor('#00ff00', 10, false)).toBe('#00cc00');
			expect(getAdjustedColor('#0000ff', 10, true)).toBe('#3332ff');
			expect(getAdjustedColor('#0000ff', 10, false)).toBe('#0000cc');
			expect(getAdjustedColor('#800080', 10, true)).toBe('#b200b2');
			expect(getAdjustedColor('#800080', 10, false)).toBe('#4c004c');
		});

		it.each([
			['undefined', undefined],
			['a named color', 'red'],
			['a CSS function', 'rgb(1,2,3)'],
			['a four-digit alpha value', '#RGBA'],
			['an eight-digit alpha value', '#0033A1BF'],
			['appended CSS', '#fff;background:url(x)'],
			['an empty string', '']
		])('should return null for %s', (_label: string, hex: string | undefined) => {
			expect(getAdjustedColor(hex, 10, true)).toBeNull();
		});
	});
});
