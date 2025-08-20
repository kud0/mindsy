#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4324';

async function testSearch() {
  console.log('🔍 Testing Search API...\n');

  // Test queries
  const testQueries = [
    'test',
    'lecture',
    'notes',
    'cornell',
    '' // Empty query test
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Testing query: "${query || '(empty)'}"...`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/notes/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: You would need to add authentication cookies here for a real test
        }
      });

      const status = response.status;
      console.log(`   Status: ${status}`);

      if (status === 401) {
        console.log('   ⚠️  Authentication required - this is expected without valid session cookies');
        const data = await response.json();
        console.log(`   Message: ${data.error}`);
      } else if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success! Found ${data.results?.length || 0} results`);
        
        if (data.results && data.results.length > 0) {
          console.log('   First result:', {
            title: data.results[0].title,
            id: data.results[0].id,
            courseSubject: data.results[0].courseSubject
          });
        }
      } else {
        console.log(`   ❌ Error: ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   Response: ${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n\n🎯 Testing Advanced Search API...\n');
  
  // Test advanced search
  const advancedQueries = [
    { q: 'test', type: 'all' },
    { q: 'test', type: 'title' },
    { q: 'test', type: 'content' }
  ];

  for (const { q, type } of advancedQueries) {
    console.log(`\n📝 Testing advanced search: query="${q}", type="${type}"...`);
    
    try {
      const response = await fetch(
        `${BASE_URL}/api/notes/search-advanced?q=${encodeURIComponent(q)}&type=${type}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const status = response.status;
      console.log(`   Status: ${status}`);

      if (status === 401) {
        console.log('   ⚠️  Authentication required');
      } else if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success! Found ${data.results?.length || 0} results`);
        
        if (data.results && data.results.length > 0) {
          const grouped = data.results.reduce((acc, r) => {
            acc[r.matchType || 'unknown'] = (acc[r.matchType || 'unknown'] || 0) + 1;
            return acc;
          }, {});
          console.log('   Match types:', grouped);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n✨ Search API tests completed!\n');
}

// Run tests
testSearch().catch(console.error);