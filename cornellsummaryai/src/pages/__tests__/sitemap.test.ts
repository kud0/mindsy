import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

describe('Sitemap Generation', () => {
  const sitemapIndexPath = path.join(process.cwd(), 'dist/client/sitemap-index.xml');
  const sitemapPath = path.join(process.cwd(), 'dist/client/sitemap-0.xml');

  beforeAll(async () => {
    // Ensure the build has been run and sitemap files exist
    if (!fs.existsSync(sitemapIndexPath) || !fs.existsSync(sitemapPath)) {
      throw new Error('Sitemap files not found. Run `npm run build` first.');
    }
  });

  it('should generate sitemap-index.xml', () => {
    expect(fs.existsSync(sitemapIndexPath)).toBe(true);
  });

  it('should generate sitemap-0.xml', () => {
    expect(fs.existsSync(sitemapPath)).toBe(true);
  });

  it('should have valid XML structure in sitemap-index.xml', async () => {
    const content = fs.readFileSync(sitemapIndexPath, 'utf8');
    const data = await parseStringPromise(content);
    
    expect(data.sitemapindex).toBeDefined();
    expect(data.sitemapindex.sitemap).toBeDefined();
    expect(Array.isArray(data.sitemapindex.sitemap)).toBe(true);
  });

  it('should have valid XML structure in sitemap-0.xml', async () => {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const data = await parseStringPromise(content);
    
    expect(data.urlset).toBeDefined();
    expect(data.urlset.url).toBeDefined();
    expect(Array.isArray(data.urlset.url)).toBe(true);
  });

  it('should include all blog post URLs', async () => {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const data = await parseStringPromise(content);
    
    const urls = data.urlset.url.map((url: any) => url.loc[0]);
    
    // Check for blog index
    expect(urls.some((url: string) => url.endsWith('/blog/'))).toBe(true);
    
    // Check for individual blog posts
    const expectedBlogPosts = [
      '/blog/building-scalable-apis/',
      '/blog/getting-started-with-astro/',
      '/blog/web-performance-optimization/'
    ];
    
    expectedBlogPosts.forEach(expectedUrl => {
      expect(urls.some((url: string) => url.endsWith(expectedUrl))).toBe(true);
    });
  });

  it('should include proper site URL in all entries', async () => {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const data = await parseStringPromise(content);
    
    const urls = data.urlset.url.map((url: any) => url.loc[0]);
    
    // All URLs should start with the site URL (or be absolute URLs)
    urls.forEach((url: string) => {
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  it('should follow XML sitemap protocol', async () => {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    
    // Check for proper XML declaration
    expect(content).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    
    // Check for proper namespace
    expect(content).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    
    // Parse to ensure valid XML
    const data = await parseStringPromise(content);
    expect(data).toBeDefined();
  });

  it('should be accessible at standard sitemap location', () => {
    // The sitemap should be generated at the root of the dist/client directory
    // which corresponds to /sitemap-index.xml when served
    const standardLocation = path.join(process.cwd(), 'dist/client/sitemap-index.xml');
    expect(fs.existsSync(standardLocation)).toBe(true);
  });
});