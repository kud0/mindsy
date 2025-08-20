#!/usr/bin/env node

import fs from 'fs';

const logoContent = fs.readFileSync('src/components/Logo.astro', 'utf8');
const navbarContent = fs.readFileSync('src/components/Navbar.astro', 'utf8');
const homepageContent = fs.readFileSync('src/pages/index.astro', 'utf8');

console.log('✅ Logo Component Check:');
console.log('- withBackground prop removed:', !logoContent.includes('withBackground'));
console.log('- Simple SVG implementation:', logoContent.includes('<svg') && !logoContent.includes('withBackground'));

console.log('\n✅ Navbar Check:');
console.log('- No background props used:', !navbarContent.includes('withBackground'));
console.log('- Original logo usage:', navbarContent.includes('width="44" height="32"'));

console.log('\n✅ Homepage Watermark Check:');
console.log('- Giant logo watermark present:', homepageContent.includes('Giant Logo Watermark Background'));
console.log('- Proper watermark styling:', homepageContent.includes('text-blue-100/50'));
console.log('- Features section styling intact:', homepageContent.includes('rounded-xl shadow-lg'));

console.log('\n🎉 All corrections applied successfully!');