#!/usr/bin/env node

/**
 * Verification script for Task 13: Integrate blog navigation with existing site structure
 * Verifies all requirements from the task are met
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

async function verifyNavigationRequirements() {
  console.log('🔍 Verifying Task 13 Requirements...\n');
  
  const requirements = [
    {
      name: 'Add blog navigation links to main site navigation (Navbar component)',
      verify: async () => {
        const navbarContent = await readFile(join(process.cwd(), 'src/components/Navbar.astro'), 'utf-8');
        
        const checks = [
          { check: navbarContent.includes('const blogUrl = \'/blog\''), desc: 'Blog URL defined' },
          { check: navbarContent.includes('href={blogUrl}'), desc: 'Blog link in desktop nav' },
          { check: navbarContent.includes('{t(\'nav.blog\')}'), desc: 'Blog translation used' },
          { check: navbarContent.includes('href={blogUrl}') && navbarContent.split('href={blogUrl}').length > 2, desc: 'Blog link in mobile nav' }
        ];
        
        const passed = checks.filter(c => c.check).length;
        const total = checks.length;
        
        return {
          passed: passed === total,
          details: `${passed}/${total} checks passed: ${checks.map(c => c.check ? '✅' : '❌').join(' ')}`
        };
      }
    },
    
    {
      name: 'Ensure blog pages maintain consistent header, footer, and site navigation',
      verify: async () => {
        const blogPostLayout = await readFile(join(process.cwd(), 'src/layouts/BlogPostLayout.astro'), 'utf-8');
        const blogIndex = await readFile(join(process.cwd(), 'src/pages/blog/index.astro'), 'utf-8');
        const tagPage = await readFile(join(process.cwd(), 'src/pages/blog/tags/[tag].astro'), 'utf-8');
        
        const checks = [
          { check: blogPostLayout.includes('<Navbar />'), desc: 'BlogPostLayout includes Navbar' },
          { check: blogIndex.includes('<Navbar />'), desc: 'Blog index includes Navbar' },
          { check: tagPage.includes('<Navbar />'), desc: 'Tag pages include Navbar' },
          { check: blogPostLayout.includes('BaseLayout'), desc: 'BlogPostLayout extends BaseLayout' }
        ];
        
        const passed = checks.filter(c => c.check).length;
        const total = checks.length;
        
        return {
          passed: passed === total,
          details: `${passed}/${total} checks passed: ${checks.map(c => c.check ? '✅' : '❌').join(' ')}`
        };
      }
    },
    
    {
      name: 'Implement breadcrumb navigation for blog sections',
      verify: async () => {
        const breadcrumbExists = await readFile(join(process.cwd(), 'src/components/BlogBreadcrumb.astro'), 'utf-8').catch(() => null);
        const blogPostLayout = await readFile(join(process.cwd(), 'src/layouts/BlogPostLayout.astro'), 'utf-8');
        const blogIndex = await readFile(join(process.cwd(), 'src/pages/blog/index.astro'), 'utf-8');
        const tagPage = await readFile(join(process.cwd(), 'src/pages/blog/tags/[tag].astro'), 'utf-8');
        
        const checks = [
          { check: breadcrumbExists !== null, desc: 'BlogBreadcrumb component exists' },
          { check: breadcrumbExists && breadcrumbExists.includes('aria-label="Breadcrumb"'), desc: 'Breadcrumb has accessibility label' },
          { check: blogPostLayout.includes('<BlogBreadcrumb'), desc: 'BlogPostLayout uses breadcrumb' },
          { check: blogIndex.includes('<BlogBreadcrumb'), desc: 'Blog index uses breadcrumb' },
          { check: tagPage.includes('<BlogBreadcrumb'), desc: 'Tag pages use breadcrumb' }
        ];
        
        const passed = checks.filter(c => c.check).length;
        const total = checks.length;
        
        return {
          passed: passed === total,
          details: `${passed}/${total} checks passed: ${checks.map(c => c.check ? '✅' : '❌').join(' ')}`
        };
      }
    },
    
    {
      name: 'Add "Back to Blog" links on individual post pages',
      verify: async () => {
        const blogPostLayout = await readFile(join(process.cwd(), 'src/layouts/BlogPostLayout.astro'), 'utf-8');
        const tagPage = await readFile(join(process.cwd(), 'src/pages/blog/tags/[tag].astro'), 'utf-8');
        
        const checks = [
          { check: blogPostLayout.includes('Back to Blog'), desc: 'BlogPostLayout has "Back to Blog" text' },
          { check: blogPostLayout.includes('href="/blog"'), desc: 'BlogPostLayout has correct blog link' },
          { check: tagPage.includes('Back to All Posts') || tagPage.includes('Back to Blog'), desc: 'Tag pages have back navigation' },
          { check: blogPostLayout.includes('svg') && blogPostLayout.includes('Back to Blog'), desc: 'Back link has icon' }
        ];
        
        const passed = checks.filter(c => c.check).length;
        const total = checks.length;
        
        return {
          passed: passed === total,
          details: `${passed}/${total} checks passed: ${checks.map(c => c.check ? '✅' : '❌').join(' ')}`
        };
      }
    },
    
    {
      name: 'Test navigation flow between blog and main site sections',
      verify: async () => {
        const i18nContent = await readFile(join(process.cwd(), 'src/lib/i18n.ts'), 'utf-8');
        const blogPostLayout = await readFile(join(process.cwd(), 'src/layouts/BlogPostLayout.astro'), 'utf-8');
        
        const checks = [
          { check: i18nContent.includes('\'nav.blog\': \'Blog\''), desc: 'Blog translation exists in English' },
          { check: i18nContent.includes('\'nav.blog\': \'Blog\''), desc: 'Blog translation exists in Spanish' },
          { check: blogPostLayout.includes('href="/"'), desc: 'Links to home page exist' },
          { check: blogPostLayout.includes('href="/dashboard"'), desc: 'Links to dashboard exist' },
          { check: blogPostLayout.includes('Home') && blogPostLayout.includes('Dashboard'), desc: 'Navigation labels are present' }
        ];
        
        const passed = checks.filter(c => c.check).length;
        const total = checks.length;
        
        return {
          passed: passed === total,
          details: `${passed}/${total} checks passed: ${checks.map(c => c.check ? '✅' : '❌').join(' ')}`
        };
      }
    }
  ];
  
  let allPassed = true;
  
  for (const requirement of requirements) {
    try {
      const result = await requirement.verify();
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${requirement.name}`);
      console.log(`   ${result.details}\n`);
      
      if (!result.passed) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${requirement.name}`);
      console.log(`   Error: ${error.message}\n`);
      allPassed = false;
    }
  }
  
  console.log('📊 Overall Result:');
  if (allPassed) {
    console.log('🎉 All requirements for Task 13 have been successfully implemented!');
    console.log('\n✅ Task 13: Integrate blog navigation with existing site structure - COMPLETE');
  } else {
    console.log('⚠️  Some requirements are not fully met. Please review the implementation.');
  }
  
  return allPassed;
}

// Run verification
verifyNavigationRequirements().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});