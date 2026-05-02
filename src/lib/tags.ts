export type Lang = 'pt' | 'en';

const LABELS: Record<string, { pt: string; en: string }> = {
	cortex: { pt: 'Cortex Digital', en: 'Digital Cortex' },
	agentes: { pt: 'Agentes', en: 'Agents' },
	whatsapp: { pt: 'WhatsApp', en: 'WhatsApp' },
	'gpt-4': { pt: 'GPT-4', en: 'GPT-4' },
	planilhas: { pt: 'Planilhas', en: 'Spreadsheets' },
	estrategia: { pt: 'Estratégia', en: 'Strategy' },
	manifesto: { pt: 'Manifesto', en: 'Manifesto' },
	rotina: { pt: 'Rotina', en: 'Routine' },
};

export function tagLabel(slug: string, lang: Lang): string {
	const entry = LABELS[slug];
	if (entry) return entry[lang];
	return slug.replace(/-/g, ' ');
}

export function tagPathFor(slug: string, lang: Lang): string {
	return lang === 'en' ? `/en/labs/tags/${slug}` : `/labs/tags/${slug}`;
}

export function tagDescription(slug: string, lang: Lang, count: number): string {
	const label = tagLabel(slug, lang);
	if (lang === 'en') {
		return count === 1
			? `1 post about ${label}.`
			: `${count} posts about ${label}.`;
	}
	return count === 1
		? `1 post sobre ${label}.`
		: `${count} posts sobre ${label}.`;
}
