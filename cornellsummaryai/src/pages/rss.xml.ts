import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  // Get all blog posts, filtering drafts based on environment
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  // Sort posts by publication date (newest first)
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime()
  );

  // Get site URL from context or use default
  const siteUrl = context.site?.toString() || 'https://your-site.com';

  return rss({
    // RSS feed metadata
    title: 'Blog RSS Feed',
    description: 'Stay updated with our latest blog posts and insights',
    site: siteUrl,
    
    // Generate RSS items from blog posts
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
      guid: `/blog/${post.slug}/`,
      author: post.data.author || 'Site Author',
      categories: post.data.tags || [],
    })),
    
    // RSS feed configuration
    customData: `<language>en-us</language>`,
    stylesheet: '/rss/styles.xsl', // Optional: XSL stylesheet for RSS display
  });
}