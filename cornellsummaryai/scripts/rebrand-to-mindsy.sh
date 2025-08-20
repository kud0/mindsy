#!/bin/bash

# Script to rebrand from Cornell to Mindsy
# This script will update all references in the codebase

echo "🎨 Starting rebranding from Cornell to Mindsy..."

# Update main translation file
echo "📝 Updating translation files..."

# Update English translations
sed -i '' "s/Cornell Method/Mindsy Method/g" src/lib/i18n.ts
sed -i '' "s/Cornell Note-Taking System/Mindsy Note-Taking System/g" src/lib/i18n.ts
sed -i '' "s/Cornell Notes/Mindsy Notes/g" src/lib/i18n.ts

# Update component files
echo "🔧 Updating React/TypeScript components..."

find src/components -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e "s/Cornell Notes Generator/Mindsy Notes Generator/g" \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell Method/Mindsy Method/g" \
  -e "s/Cornell note/Mindsy note/g" \
  -e "s/cornell notes/mindsy notes/g" \
  -e "s/Cornell-style/Mindsy-style/g" \
  -e "s/cornell/mindsy/g" {} \;

# Update API files
echo "🌐 Updating API endpoints..."

find src/pages/api -type f -name "*.ts" -exec sed -i '' \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell note/Mindsy note/g" \
  -e "s/generateCornellNotes/generateMindsyNotes/g" \
  -e "s/CornellNotesInput/MindsyNotesInput/g" \
  -e "s/cornellNotes/mindsyNotes/g" \
  -e "s/cornellResult/mindsyResult/g" \
  -e "s/Cornell structure/Mindsy structure/g" {} \;

# Update library files
echo "📚 Updating library files..."

find src/lib -type f -name "*.ts" -exec sed -i '' \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell note/Mindsy note/g" \
  -e "s/generateCornellNotes/generateMindsyNotes/g" \
  -e "s/CornellNotesInput/MindsyNotesInput/g" \
  -e "s/cornellNotes/mindsyNotes/g" \
  -e "s/Cornell-style/Mindsy-style/g" \
  -e "s/Cornell Method/Mindsy Method/g" {} \;

# Update Astro pages
echo "🚀 Updating Astro pages..."

find src/pages -type f -name "*.astro" -exec sed -i '' \
  -e "s/Cornell Notes Generator/Mindsy Notes Generator/g" \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell Method/Mindsy Method/g" \
  -e "s/Cornell note/Mindsy note/g" \
  -e "s/cornell-icon/mindsy-icon/g" \
  -e "s/Cornell/Mindsy/g" {} \;

# Update documentation files
echo "📖 Updating documentation..."

find . -maxdepth 2 -type f \( -name "*.md" -o -name "README*" \) -exec sed -i '' \
  -e "s/Cornell Notes Generator/Mindsy Notes Generator/g" \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell Method/Mindsy Method/g" \
  -e "s/Cornell note/Mindsy note/g" \
  -e "s/cornell notes/mindsy notes/g" {} \;

# Update package.json
echo "📦 Updating package.json..."
sed -i '' "s/cornell/mindsy/g" package.json

# Update test files
echo "🧪 Updating test files..."

find . -path "*/node_modules" -prune -o -type f -name "*.test.ts" -exec sed -i '' \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell note/Mindsy note/g" \
  -e "s/cornell/mindsy/g" {} \;

# Update SQL files
echo "🗄️ Updating SQL files..."

find . -type f -name "*.sql" -exec sed -i '' \
  -e "s/Cornell Notes/Mindsy Notes/g" \
  -e "s/Cornell note/Mindsy note/g" {} \;

# Update CSS classes
echo "🎨 Updating CSS classes..."
find src -type f \( -name "*.astro" -o -name "*.tsx" -o -name "*.css" \) -exec sed -i '' \
  -e "s/cornell-icon/mindsy-icon/g" {} \;

echo "✅ Rebranding complete! Please review the changes and test the application."
echo ""
echo "⚠️  Note: Some function names and imports may need manual adjustment."
echo "   Please run the following commands to verify:"
echo "   1. npm run build"
echo "   2. npm test"
echo ""
echo "📌 Don't forget to:"
echo "   - Update any external services or APIs that reference Cornell"
echo "   - Update environment variables if needed"
echo "   - Update any stored procedures or database functions"
echo "   - Update logo and branding assets"