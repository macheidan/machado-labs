import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_TITLE, SITE_DESCRIPTION_EN } from '../../consts';

export async function GET(context) {
	const posts = await getCollection('labs-en');
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION_EN,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/en/labs/${post.id}/`,
		})),
	});
}
