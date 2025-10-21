#!/bin/bash

# Dark Mode Bulk Fix Script
# Applies find/replace patterns to fix hardcoded colors across the codebase
# USE WITH CAUTION: Review changes before committing

set -e

echo "🌗 Dark Mode Bulk Fix Script"
echo "=============================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to backup files
backup_files() {
    echo -e "${YELLOW}📦 Creating backup...${NC}"
    BACKUP_DIR="backups/dark-mode-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup critical files
    cp -r components/student-desk-v2 "$BACKUP_DIR/"
    cp components/share/ShareModal.tsx "$BACKUP_DIR/"
    cp components/navigation/BottomNavbar.tsx "$BACKUP_DIR/"
    cp app/layout.tsx "$BACKUP_DIR/"

    echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
}

# Function to fix background colors
fix_backgrounds() {
    echo ""
    echo -e "${YELLOW}🎨 Fixing background colors...${NC}"

    # Find all .tsx files in components/
    FILES=$(find components -name "*.tsx" -type f)

    for file in $FILES; do
        # Skip if file doesn't contain the patterns
        if ! grep -q "bg-white\|bg-gray-50\|bg-gray-100" "$file"; then
            continue
        fi

        echo "  Processing: $file"

        # Create temp file
        temp_file="${file}.tmp"

        # Apply replacements
        # bg-white → bg-background (only if not followed by dark:)
        sed 's/\(className="[^"]*\)bg-white\([^-][^"]*"\)/\1bg-background\2/g' "$file" > "$temp_file"

        # bg-gray-50 → bg-secondary (only if not followed by dark:)
        sed -i '' 's/\(className="[^"]*\)bg-gray-50\([^-][^"]*"\)/\1bg-secondary\2/g' "$temp_file"

        # bg-gray-100 → bg-muted
        sed -i '' 's/\(className="[^"]*\)bg-gray-100\([^-][^"]*"\)/\1bg-muted\2/g' "$temp_file"

        # Move temp file to original
        mv "$temp_file" "$file"
    done

    echo -e "${GREEN}✅ Background colors fixed${NC}"
}

# Function to fix text colors
fix_text_colors() {
    echo ""
    echo -e "${YELLOW}📝 Fixing text colors...${NC}"

    FILES=$(find components -name "*.tsx" -type f)

    for file in $FILES; do
        # Skip if file doesn't contain the patterns
        if ! grep -q "text-gray-\|text-black" "$file"; then
            continue
        fi

        echo "  Processing: $file"

        temp_file="${file}.tmp"

        # text-black → text-foreground
        sed 's/\(className="[^"]*\)text-black\([^-][^"]*"\)/\1text-foreground\2/g' "$file" > "$temp_file"

        # text-gray-900 → text-foreground
        sed -i '' 's/\(className="[^"]*\)text-gray-900\([^"]*"\)/\1text-foreground\2/g' "$temp_file"

        # text-gray-800 → text-foreground
        sed -i '' 's/\(className="[^"]*\)text-gray-800\([^"]*"\)/\1text-foreground\2/g' "$temp_file"

        # text-gray-700 → text-foreground
        sed -i '' 's/\(className="[^"]*\)text-gray-700\([^"]*"\)/\1text-foreground\2/g' "$temp_file"

        # text-gray-600 → text-muted-foreground
        sed -i '' 's/\(className="[^"]*\)text-gray-600\([^"]*"\)/\1text-muted-foreground\2/g' "$temp_file"

        # text-gray-500 → text-muted-foreground
        sed -i '' 's/\(className="[^"]*\)text-gray-500\([^"]*"\)/\1text-muted-foreground\2/g' "$temp_file"

        # text-gray-400 → text-muted-foreground
        sed -i '' 's/\(className="[^"]*\)text-gray-400\([^"]*"\)/\1text-muted-foreground\2/g' "$temp_file"

        mv "$temp_file" "$file"
    done

    echo -e "${GREEN}✅ Text colors fixed${NC}"
}

# Function to fix border colors
fix_borders() {
    echo ""
    echo -e "${YELLOW}🔲 Fixing border colors...${NC}"

    FILES=$(find components -name "*.tsx" -type f)

    for file in $FILES; do
        if ! grep -q "border-gray-" "$file"; then
            continue
        fi

        echo "  Processing: $file"

        temp_file="${file}.tmp"

        # border-gray-200 → border-border
        sed 's/\(className="[^"]*\)border-gray-200\([^"]*"\)/\1border-border\2/g' "$file" > "$temp_file"

        # border-gray-300 → border-border
        sed -i '' 's/\(className="[^"]*\)border-gray-300\([^"]*"\)/\1border-border\2/g' "$temp_file"

        mv "$temp_file" "$file"
    done

    echo -e "${GREEN}✅ Border colors fixed${NC}"
}

# Function to fix hover states
fix_hover_states() {
    echo ""
    echo -e "${YELLOW}🖱️  Fixing hover states...${NC}"

    FILES=$(find components -name "*.tsx" -type f)

    for file in $FILES; do
        if ! grep -q "hover:bg-gray-" "$file"; then
            continue
        fi

        echo "  Processing: $file"

        temp_file="${file}.tmp"

        # hover:bg-gray-50 → hover:bg-muted
        sed 's/\(className="[^"]*\)hover:bg-gray-50\([^"]*"\)/\1hover:bg-muted\2/g' "$file" > "$temp_file"

        # hover:bg-gray-100 → hover:bg-muted
        sed -i '' 's/\(className="[^"]*\)hover:bg-gray-100\([^"]*"\)/\1hover:bg-muted\2/g' "$temp_file"

        mv "$temp_file" "$file"
    done

    echo -e "${GREEN}✅ Hover states fixed${NC}"
}

# Function to generate report
generate_report() {
    echo ""
    echo -e "${YELLOW}📊 Generating report...${NC}"

    REPORT_FILE="dark-mode-fix-report-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "Dark Mode Fix Report"
        echo "===================="
        echo "Date: $(date)"
        echo ""
        echo "Files Modified:"
        git status --short | grep "^ M"
        echo ""
        echo "Remaining Issues:"
        echo ""
        echo "Hardcoded bg-white:"
        grep -rn "bg-white[^-]" components/ --include="*.tsx" | wc -l
        echo ""
        echo "Hardcoded text-gray:"
        grep -rn "text-gray-[4-9]00" components/ --include="*.tsx" | wc -l
        echo ""
        echo "Hardcoded border-gray:"
        grep -rn "border-gray-[23]00" components/ --include="*.tsx" | wc -l
    } > "$REPORT_FILE"

    echo -e "${GREEN}✅ Report saved to: $REPORT_FILE${NC}"
    cat "$REPORT_FILE"
}

# Main execution
main() {
    echo "This script will modify TypeScript files in the components directory."
    echo "A backup will be created before making changes."
    echo ""
    read -p "Continue? (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi

    # Create backup
    backup_files

    # Apply fixes
    fix_backgrounds
    fix_text_colors
    fix_borders
    fix_hover_states

    # Generate report
    generate_report

    echo ""
    echo -e "${GREEN}✅ Dark mode bulk fix completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git diff"
    echo "2. Test in browser (light + dark mode)"
    echo "3. Run tests: npm run test"
    echo "4. Commit if satisfied: git add . && git commit -m 'fix: dark mode bulk refactor'"
    echo ""
    echo -e "${RED}⚠️  If issues arise, restore from backup:${NC}"
    echo "   cp -r $BACKUP_DIR/* ./"
}

# Run main function
main
