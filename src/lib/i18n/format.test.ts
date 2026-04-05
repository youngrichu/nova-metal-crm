import { describe, expect, it } from 'vitest';
import { getFormattingLocale } from './format';

describe('getFormattingLocale', () => {
	it('maps english app locale to an english Ethiopian formatting locale', () => {
		expect(getFormattingLocale('en')).toBe('en-ET');
	});

	it('maps amharic app locale to an amharic Ethiopian formatting locale', () => {
		expect(getFormattingLocale('am')).toBe('am-ET');
	});

	it('passes through explicit BCP-47 locales', () => {
		expect(getFormattingLocale('en-US')).toBe('en-US');
	});
});
