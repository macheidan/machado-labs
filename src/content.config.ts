import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const schema = ({ image }: { image: () => any }) =>
	z.object({
		title: z.string(),
		heroTitle: z.string().optional(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.optional(image()),
		heroAlt: z.string().optional(),
		author: z.string().default('Fábio Machado'),
		tags: z.array(z.string()).default([]),
		keywords: z.array(z.string()).optional(),
	});

const labs = defineCollection({
	loader: glob({ base: './src/content/labs', pattern: '**/*.{md,mdx}' }),
	schema,
});

const labsEn = defineCollection({
	loader: glob({ base: './src/content/labs-en', pattern: '**/*.{md,mdx}' }),
	schema,
});

export const collections = { labs, 'labs-en': labsEn };
