#!/usr/bin/env node

/**
 * Test script to verify blog navigation integration
 * Tests that blog navigation links are properly integrated with the site structure
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

async function testBlogNavigationIntegration() {
  console.log('🧪 Testing Blog Navigation Integration...\n');
  
  let passed = 0;
  let failed = 0;
  
  const tests = [
    {
      name: 'Navbar includes blog link',
      test: async () => {
        const navbarContent = await readFile(join(process.cwd(), 'src/components/Navbar.astro'), 'utf-8');
        
        // Check if blog URL is defined
        if (!navbarContent.includes('const blogUrl = \'/blog\'')) {
          throw new Error('Blog URL not defined in Navbar');
        }
        
        // Check if blog link is in desktop navigation
        if (!navbarContent.includes('href={blogUrl}')) {
          throw new Error('Blog link not found in desktop navigation');
        }
        
        // Check if blog translation is used
        if (!navbarContent.includes('{t(\'nav.blog\')}')) {
          throw new Error('Blog translation not used in navigation');
        }
        
        return 'Blog link properly integrated in Navbar';
      }
    },
    
    {
      name: 'i18n includes blog translations',
      test: async () => {
        const i18nContent = await readFile(join(process.cwd(), 'src/lib/i18n.ts'), 'utf-8');
        
        // Check English translation
        if (!i18nContent.includes('\'nav.blog\': \'Blog\'')) {
          throw new Error('English blog translation missing');
        }
        
        // Check Spanish translation
        if (!i18nContent.includes('\'nav.blog\': \'Blog\'')) {
          throw new Error('Spanish blog translation missing');
        }
        
        return 'Blog translations properly added to i18n';
      }
    },
    
    {
      name: 'BlogPostLayout includes navigation',
      test: async () => {
        const layoutContent = await readFile(join(process.cwd(), 'src/layouts/BlogPostLayout.astro'), 'utf-8');
        
        // Check if Navbar is imported and used
        if (!layoutContent.includes('import Navbar from \'../components/Navbar.astro\'')) {
          throw new Error('Navbar not imported in BlogPostLayout');
        }
        
        if (!layoutContent.includes('<Navbar />')) {
          throw new Error('Navbar not used in BlogPostLayout');
        }
        
        // Check if breadcrumb is imported and used
        if (!layoutContent.includes('import BlogBreadcrumb from \'../components/BlogBreadcrumb.astro\'')) {
          throw new Error('BlogBreadcrumb not imported in BlogPostLayout');
        }
        
        if (!layoutContent.includes('<BlogBreadcrumb')) {
          throw new Error('BlogBreadcrumb not used in BlogPostLayout');
        }
        
        return 'Navigation properly integrated in BlogPostLayout';
      }
    },
    
    {
      name: 'BlogBreadcrumb component exists',
      test: async () => {
        const breadcrumbContent = await readFile(join(process.cwd(), 'src/components/BlogBreadcrumb.astro'), 'utf-8');
        
        // Check component structure
        if (!breadcrumbContent.includes('export interface Props')) {
          throw new Error('Props interface not defined');
        }
        
        if (!breadcrumbContent.includes('items: Array<{')) {
          throw new Error('Items array type not defined');
        }
        
        if (!breadcrumbContent.includes('aria-label="Breadcrumb"')) {
          throw new Error('Accessibility label missing');
        }
        
        return 'BlogBreadcrumb component properly structured';
      }
    },
    
    {
      name: 'Blog index page uses breadcrumb',
      test: async () => {
        const indexContent = await readFile(join(process.cwd(), 'src/pages/blog/index.astro'), 'utf-8');
        
        // Check if breadcrumb is imported and used
        if (!indexContent.includes('import BlogBreadcrumb from "../../components/BlogBreadcrumb.astro"')) {
          throw new Error('BlogBreadcrumb not imported in blog index');
        }
        
        if (!indexContent.includes('<BlogBreadcrumb')) {
          throw new Error('BlogBreadcrumb not used in blog index');
        }
        
        return 'Blog index page uses breadcrumb navigation';
      }
    },
    
    {
      name: 'Tag pages use breadcrumb',
      test: async () => {
        const tagContent = await readFile(join(process.cwd(), 'src/pages/blog/tags/[tag].astro'), 'utf-8');
        
        // Check if breadcrumb is imported and used
        if (!tagContent.includes('import BlogBreadcrumb from "../../../components/BlogBreadcrumb.astro"')) {
          throw new Error('BlogBreadcrumb not imported in tag page');
        }
        
        if (!tagContent.includes('<BlogBreadcrumb')) {
          throw new Error('BlogBreadcrumb not used in tag page');
        }
        
        return 'Tag pages use breadcrumb navigation';
      }
    },
    
    {
      name: 'Back to blog links exist',
      test: async () => {
        const layoutContent = await readFile(join(process.cwd(), 'src/layouts/BlogPostLayout.astro'), 'utf-8');
        
        // Check for back to blog link
        if (!layoutContent.includes('Back to Blog')) {
          throw new Error('Back to Blog link not found');
        }
        
        if (!layoutContent.includes('href="/blog"')) {
          throw new Error('Back to Blog link href not correct');
        }
        
        return 'Back to Blog links properly implemented';
      }
    }
  ];
  
  // Run all tests
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`✅ ${test.name}: ${result}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All blog navigation integration tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run the tests
testBlogNavigationIntegration().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});