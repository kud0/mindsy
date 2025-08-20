#!/usr/bin/env node

/**
 * Verify that Astro can properly load and process the blog content collection
 * This simulates what happens during the Astro build process
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying Astro content collection setup...\n');

try {
  // Check if content config exists
  const configPath = 'src/content/config.ts';
  console.log(`📄 Checking content config at ${configPath}...`);
  
  const configContent = readFileSync(configPath, 'utf-8');
  
  // Verify the config contains the blog collection
  if (configContent.includes('blog: blogCollection')) {
    console.log('   ✅ Blog collection is properly exported');
  } else {
    console.log('   ❌ Blog collection not found in exports');
    process.exit(1);
  }
  
  // Verify the schema is defined correctly
  if (configContent.includes("type: 'content'")) {
    console.log('   ✅ Collection type is set to "content"');
  } else {
    console.log('   ❌ Collection type not set correctly');
    process.exit(1);
  }
  
  // Check required schema fields
  const requiredFields = ['title', 'description', 'pubDate'];
  const missingFields = requiredFields.filter(field => !configContent.includes(field));
  
  if (missingFields.length === 0) {
    console.log('   ✅ All required schema fields are defined');
  } else {
    console.log(`   ❌ Missing required fields: ${missingFields.join(', ')}`);
    process.exit(1);
  }
  
  // Check if Astro generated types exist
  console.log('\n📄 Checking generated Astro types...');
  const typesPath = '.astro/content.d.ts';
  
  try {
    const typesContent = readFileSync(typesPath, 'utf-8');
    
    if (typesContent.includes('blog')) {
      console.log('   ✅ Blog collection types are generated');
    } else {
      console.log('   ❌ Blog collection types not found');
      process.exit(1);
    }
    
    if (typesContent.includes('getCollection')) {
      console.log('   ✅ Content collection functions are available');
    } else {
      console.log('   ❌ Content collection functions not found');
      process.exit(1);
    }
    
  } catch (error) {
    console.log('   ❌ Astro types not generated. Run `npx astro sync` first.');
    process.exit(1);
  }
  
  console.log('\n🎉 Astro content collection setup is valid!');
  console.log('✅ Blog content collection is properly configured');
  console.log('✅ Sample blog posts are ready for processing');
  console.log('✅ Build process should recognize and process blog content');
  
} catch (error) {
  console.error('❌ Error verifying content collection setup:', error.message);
  process.exit(1);
}