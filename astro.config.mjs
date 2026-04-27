// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';

const BUILD_TIME = new Date().toISOString();

function postLastmod(url) {
	const enMatch = url.match(/\/en\/labs\/([^/]+)\/?$/);
	const ptMatch = url.match(/\/labs\/([^/]+)\/?$/);
	const dir = enMatch ? './src/content/labs-en' : ptMatch ? './src/content/labs' : null;
	const slug = (enMatch || ptMatch)?.[1];
	if (!dir || !slug) return null;

	const filePath = path.join(dir, `${slug}.md`);
	if (!fs.existsSync(filePath)) return null;

	const content = fs.readFileSync(filePath, 'utf-8');
	const updated = content.match(/updatedDate:\s*['"]?([^'"\n]+)['"]?/)?.[1]?.trim();
	const pub = content.match(/pubDate:\s*['"]?([^'"\n]+)['"]?/)?.[1]?.trim();
	const dateStr = updated || pub;
	if (!dateStr) return null;

	const date = new Date(dateStr);
	return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

// https://astro.build/config
export default defineConfig({
	site: 'https://fabiomachado.com.br',
	integrations: [
		mdx(),
		sitemap({
			serialize(item) {
				return { ...item, lastmod: postLastmod(item.url) || BUILD_TIME };
			},
		}),
	],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
