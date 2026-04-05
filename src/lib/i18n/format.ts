export function getFormattingLocale(locale: string): string {
	if (locale === 'en') return 'en-ET';
	if (locale === 'am') return 'am-ET';
	return locale;
}
