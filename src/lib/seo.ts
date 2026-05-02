import { AUTHOR_NAME, AUTHOR_X, SITE_TITLE } from '../consts';

export const SITE_URL = 'https://fabiomachado.com.br';

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_PT_ID = `${SITE_URL}/#website`;
const WEBSITE_EN_ID = `${SITE_URL}/en/#website`;
const PERSON_PT_ID = `${SITE_URL}/about#fabio`;
const PERSON_EN_ID = `${SITE_URL}/en/about#fabio`;

const ADDRESS = {
	'@type': 'PostalAddress',
	addressLocality: 'Porto Alegre',
	addressRegion: 'RS',
	addressCountry: 'BR',
};

const WORKS_FOR = [
	{ '@type': 'Organization', name: 'Lov Pizza' },
	{ '@type': 'Organization', name: 'Dáme Pizza' },
];

const KNOWS_PT = [
	'Inteligência Artificial',
	'Agentes de IA',
	'Gestão de pequenas e médias empresas',
	'Automação de processos',
	'Consultoria em IA aplicada',
	'Marketing para PMEs',
];

const KNOWS_EN = [
	'Artificial Intelligence',
	'AI Agents',
	'Small and mid-size business management',
	'Process automation',
	'Applied AI consulting',
	'Marketing for SMBs',
];

function organization() {
	return {
		'@type': 'Organization',
		'@id': ORG_ID,
		name: SITE_TITLE,
		url: `${SITE_URL}/`,
		founder: { '@id': PERSON_PT_ID },
		sameAs: [AUTHOR_X],
	};
}

function personPt() {
	return {
		'@type': 'Person',
		'@id': PERSON_PT_ID,
		name: AUTHOR_NAME,
		url: `${SITE_URL}/about`,
		jobTitle: 'Empresário e consultor em IA',
		description:
			'Empresário, consultor e construtor de sistemas de IA aplicados a pequenas e médias empresas reais.',
		sameAs: [AUTHOR_X],
		worksFor: WORKS_FOR,
		knowsAbout: KNOWS_PT,
		address: ADDRESS,
		nationality: { '@type': 'Country', name: 'Brazil' },
	};
}

function personEn() {
	return {
		'@type': 'Person',
		'@id': PERSON_EN_ID,
		name: AUTHOR_NAME,
		url: `${SITE_URL}/en/about`,
		jobTitle: 'Entrepreneur and AI consultant',
		description:
			'Entrepreneur, consultant, and builder of AI systems applied to real small and mid-size businesses.',
		sameAs: [AUTHOR_X],
		worksFor: WORKS_FOR,
		knowsAbout: KNOWS_EN,
		address: ADDRESS,
		nationality: { '@type': 'Country', name: 'Brazil' },
	};
}

function website(lang: 'pt' | 'en', description: string) {
	const id = lang === 'en' ? WEBSITE_EN_ID : WEBSITE_PT_ID;
	const url = lang === 'en' ? `${SITE_URL}/en/` : `${SITE_URL}/`;
	const personId = lang === 'en' ? PERSON_EN_ID : PERSON_PT_ID;
	return {
		'@type': 'WebSite',
		'@id': id,
		name: SITE_TITLE,
		url,
		inLanguage: lang === 'en' ? 'en' : 'pt-BR',
		description,
		publisher: { '@id': ORG_ID },
		author: { '@id': personId },
	};
}

export function homeGraph(lang: 'pt' | 'en', description: string) {
	const person = lang === 'en' ? personEn() : personPt();
	return {
		'@context': 'https://schema.org',
		'@graph': [organization(), website(lang, description), person],
	};
}

export function profileGraph(lang: 'pt' | 'en', description: string) {
	const person = lang === 'en' ? personEn() : personPt();
	const profileUrl = lang === 'en' ? `${SITE_URL}/en/about` : `${SITE_URL}/about`;
	return {
		'@context': 'https://schema.org',
		'@graph': [
			organization(),
			website(lang, description),
			person,
			{
				'@type': 'ProfilePage',
				url: profileUrl,
				inLanguage: lang === 'en' ? 'en' : 'pt-BR',
				mainEntity: { '@id': lang === 'en' ? PERSON_EN_ID : PERSON_PT_ID },
				about: { '@id': lang === 'en' ? PERSON_EN_ID : PERSON_PT_ID },
			},
		],
	};
}

export function articleGraph(opts: {
	lang: 'pt' | 'en';
	title: string;
	description: string;
	pubDate: Date;
	updatedDate?: Date;
	slug: string;
	imageUrl: string;
	keywords?: string[];
}) {
	const { lang, title, description, pubDate, updatedDate, slug, imageUrl, keywords } = opts;
	const isEn = lang === 'en';
	const personId = isEn ? PERSON_EN_ID : PERSON_PT_ID;
	const websiteId = isEn ? WEBSITE_EN_ID : WEBSITE_PT_ID;
	const pageUrl = isEn ? `${SITE_URL}/en/labs/${slug}/` : `${SITE_URL}/labs/${slug}/`;
	const labsUrl = isEn ? `${SITE_URL}/en/` : `${SITE_URL}/`;
	const labsLabel = 'Labs';
	const homeLabel = 'Home';

	const article: Record<string, any> = {
		'@type': 'Article',
		headline: title,
		description,
		image: [imageUrl],
		datePublished: pubDate.toISOString(),
		dateModified: (updatedDate ?? pubDate).toISOString(),
		inLanguage: isEn ? 'en' : 'pt-BR',
		author: { '@id': personId },
		publisher: { '@id': ORG_ID },
		isPartOf: { '@id': websiteId },
		mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
	};
	if (keywords && keywords.length > 0) article.keywords = keywords.join(', ');

	return {
		'@context': 'https://schema.org',
		'@graph': [
			organization(),
			website(lang, description),
			isEn ? personEn() : personPt(),
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: homeLabel, item: labsUrl },
					{ '@type': 'ListItem', position: 2, name: labsLabel, item: labsUrl },
					{ '@type': 'ListItem', position: 3, name: title, item: pageUrl },
				],
			},
			article,
		],
	};
}

export function tagGraph(opts: {
	lang: 'pt' | 'en';
	tag: string;
	tagLabel: string;
	description: string;
}) {
	const { lang, tag, tagLabel, description } = opts;
	const isEn = lang === 'en';
	const websiteId = isEn ? WEBSITE_EN_ID : WEBSITE_PT_ID;
	const pageUrl = isEn ? `${SITE_URL}/en/labs/tags/${tag}/` : `${SITE_URL}/labs/tags/${tag}/`;
	const labsUrl = isEn ? `${SITE_URL}/en/` : `${SITE_URL}/`;

	return {
		'@context': 'https://schema.org',
		'@graph': [
			organization(),
			website(lang, description),
			isEn ? personEn() : personPt(),
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Home', item: labsUrl },
					{ '@type': 'ListItem', position: 2, name: 'Labs', item: labsUrl },
					{ '@type': 'ListItem', position: 3, name: tagLabel, item: pageUrl },
				],
			},
			{
				'@type': 'CollectionPage',
				name: tagLabel,
				description,
				url: pageUrl,
				inLanguage: isEn ? 'en' : 'pt-BR',
				isPartOf: { '@id': websiteId },
			},
		],
	};
}
