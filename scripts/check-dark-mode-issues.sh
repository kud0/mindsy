#!/bin/bash

# Dark Mode Issue Checker
# Scans codebase for hardcoded colors that will break dark mode
# Generates a prioritized list of issues

set -e

echo "🔍 Dark Mode Issue Scanner"
echo "==========================="
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Counters
CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0

# Output file
OUTPUT="dark-mode-issues-$(date +%Y%m%d-%H%M%S).md"

# Header
{
    echo "# Dark Mode Issues Report"
    echo ""
    echo "**Generated**: $(date)"
    echo ""
    echo "---"
    echo ""
} > "$OUTPUT"

# Function to check critical components
check_critical_components() {
    echo -e "${RED}🚨 CRITICAL: Checking main components...${NC}"

    {
        echo "## 🚨 CRITICAL Issues"
        echo ""
        echo "These MUST be fixed before production launch."
        echo ""
    } >> "$OUTPUT"

    # StudentDesk
    echo "  Checking StudentDesk.tsx..."
    COUNT=$(grep -n "bg-white\|text-black\|text-gray-[4-9]00\|border-gray-[23]00" components/student-desk-v2/StudentDesk.tsx 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        {
            echo "### StudentDesk.tsx"
            echo ""
            echo "**Issues found**: $COUNT"
            echo ""
            echo "\`\`\`"
            grep -n "bg-white\|text-black\|text-gray-[4-9]00\|border-gray-[23]00" components/student-desk-v2/StudentDesk.tsx 2>/dev/null | head -20
            echo "\`\`\`"
            echo ""
        } >> "$OUTPUT"
        CRITICAL=$((CRITICAL + COUNT))
    fi

    # ShareModal
    echo "  Checking ShareModal.tsx..."
    COUNT=$(grep -n "bg-white\|text-gray-[4-9]00\|border-gray-[23]00" components/share/ShareModal.tsx 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        {
            echo "### ShareModal.tsx"
            echo ""
            echo "**Issues found**: $COUNT"
            echo ""
            echo "\`\`\`"
            grep -n "bg-white\|text-gray-[4-9]00\|border-gray-[23]00" components/share/ShareModal.tsx 2>/dev/null | head -20
            echo "\`\`\`"
            echo ""
        } >> "$OUTPUT"
        CRITICAL=$((CRITICAL + COUNT))
    fi

    # BottomNavbar
    echo "  Checking BottomNavbar.tsx..."
    COUNT=$(grep -n "bg-white\|text-gray-[4-9]00\|border-gray-[23]00" components/navigation/BottomNavbar.tsx 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        {
            echo "### BottomNavbar.tsx"
            echo ""
            echo "**Issues found**: $COUNT"
            echo ""
            echo "\`\`\`"
            grep -n "bg-white\|text-gray-[4-9]00\|border-gray-[23]00" components/navigation/BottomNavbar.tsx 2>/dev/null | head -20
            echo "\`\`\`"
            echo ""
        } >> "$OUTPUT"
        CRITICAL=$((CRITICAL + COUNT))
    fi

    # Tab components
    echo "  Checking tab components..."
    TAB_COUNT=0
    for file in components/student-desk-v2/tabs/*.tsx; do
        if [ -f "$file" ]; then
            COUNT=$(grep -n "text-gray-[4-9]00\|bg-gray-[1-3]00\|border-gray-[23]00" "$file" 2>/dev/null | wc -l | tr -d ' ')
            if [ "$COUNT" -gt 0 ]; then
                TAB_COUNT=$((TAB_COUNT + COUNT))
            fi
        fi
    done

    if [ "$TAB_COUNT" -gt 0 ]; then
        {
            echo "### Tab Components (9 files)"
            echo ""
            echo "**Total issues**: $TAB_COUNT"
            echo ""
            echo "Files affected:"
            echo ""
            for file in components/student-desk-v2/tabs/*.tsx; do
                if [ -f "$file" ]; then
                    COUNT=$(grep -n "text-gray-[4-9]00\|bg-gray-[1-3]00\|border-gray-[23]00" "$file" 2>/dev/null | wc -l | tr -d ' ')
                    if [ "$COUNT" -gt 0 ]; then
                        echo "- \`$(basename "$file")\`: $COUNT issues"
                    fi
                fi
            done
            echo ""
        } >> "$OUTPUT"
        CRITICAL=$((CRITICAL + TAB_COUNT))
    fi

    {
        echo "**Total CRITICAL issues**: $CRITICAL"
        echo ""
        echo "---"
        echo ""
    } >> "$OUTPUT"
}

# Function to check high priority components
check_high_priority() {
    echo -e "${YELLOW}⚠️  HIGH: Checking high priority components...${NC}"

    {
        echo "## ⚠️ HIGH Priority Issues"
        echo ""
        echo "Should be fixed before production launch."
        echo ""
    } >> "$OUTPUT"

    # UploadDialog
    echo "  Checking UploadDialog.tsx..."
    COUNT=$(grep -n "bg-gray-[1-3]00[^-]\|text-gray-[4-9]00[^-]" components/upload/UploadDialog.tsx 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        {
            echo "### UploadDialog.tsx"
            echo ""
            echo "**Issues found**: $COUNT"
            echo ""
            echo "Partial dark mode support. Needs completion."
            echo ""
        } >> "$OUTPUT"
        HIGH=$((HIGH + COUNT))
    fi

    # Layout.tsx
    echo "  Checking layout.tsx..."
    if grep -q 'content="light"' app/layout.tsx 2>/dev/null; then
        {
            echo "### layout.tsx"
            echo ""
            echo "**Issue**: Meta tag restricts to light mode only"
            echo ""
            echo "\`\`\`tsx"
            echo '<meta name="color-scheme" content="light" />'
            echo "\`\`\`"
            echo ""
            echo "Should be: \`content=\"light dark\"\`"
            echo ""
        } >> "$OUTPUT"
        HIGH=$((HIGH + 1))
    fi

    # Status colors
    echo "  Checking status colors..."
    STATUS_COUNT=$(grep -rn "bg-green-50\|bg-red-50\|bg-blue-50\|bg-yellow-50" components/ --include="*.tsx" 2>/dev/null | grep -v "dark:" | wc -l | tr -d ' ')
    if [ "$STATUS_COUNT" -gt 0 ]; then
        {
            echo "### Status Colors Without Dark Variants"
            echo ""
            echo "**Issues found**: $STATUS_COUNT"
            echo ""
            echo "Status colors (success/error/info/warning) need explicit dark variants."
            echo ""
        } >> "$OUTPUT"
        HIGH=$((HIGH + STATUS_COUNT))
    fi

    {
        echo "**Total HIGH priority issues**: $HIGH"
        echo ""
        echo "---"
        echo ""
    } >> "$OUTPUT"
}

# Function to check medium priority
check_medium_priority() {
    echo -e "${YELLOW}📋 MEDIUM: Checking medium priority components...${NC}"

    {
        echo "## 📋 MEDIUM Priority Issues"
        echo ""
        echo "Can be fixed post-launch."
        echo ""
    } >> "$OUTPUT"

    # Widgets
    echo "  Checking widgets..."
    WIDGET_COUNT=0
    for file in components/widgets/*.tsx; do
        if [ -f "$file" ]; then
            COUNT=$(grep -n "bg-white\|text-gray-[4-9]00" "$file" 2>/dev/null | wc -l | tr -d ' ')
            WIDGET_COUNT=$((WIDGET_COUNT + COUNT))
        fi
    done

    if [ "$WIDGET_COUNT" -gt 0 ]; then
        {
            echo "### Widget System"
            echo ""
            echo "**Issues found**: $WIDGET_COUNT"
            echo ""
        } >> "$OUTPUT"
        MEDIUM=$((MEDIUM + WIDGET_COUNT))
    fi

    # Gradients
    echo "  Checking gradients..."
    GRADIENT_COUNT=$(grep -rn "bg-gradient-to-" components/ app/ --include="*.tsx" 2>/dev/null | grep -v "dark:" | wc -l | tr -d ' ')
    if [ "$GRADIENT_COUNT" -gt 0 ]; then
        {
            echo "### Gradients Without Dark Variants"
            echo ""
            echo "**Issues found**: $GRADIENT_COUNT"
            echo ""
        } >> "$OUTPUT"
        MEDIUM=$((MEDIUM + GRADIENT_COUNT))
    fi

    {
        echo "**Total MEDIUM priority issues**: $MEDIUM"
        echo ""
        echo "---"
        echo ""
    } >> "$OUTPUT"
}

# Function to generate summary
generate_summary() {
    TOTAL=$((CRITICAL + HIGH + MEDIUM))

    {
        echo "## 📊 Summary"
        echo ""
        echo "| Severity | Count | Status |"
        echo "|---|---:|---|"
        echo "| 🚨 CRITICAL | $CRITICAL | Must fix before launch |"
        echo "| ⚠️ HIGH | $HIGH | Should fix before launch |"
        echo "| 📋 MEDIUM | $MEDIUM | Can fix post-launch |"
        echo "| **TOTAL** | **$TOTAL** | |"
        echo ""
        echo "---"
        echo ""
        echo "## 🎯 Recommended Action Plan"
        echo ""
        echo "### Phase 1: Critical Fixes (BLOCKING LAUNCH)"
        echo ""
        echo "1. Fix StudentDesk.tsx ($CRITICAL issues in main study interface)"
        echo "2. Fix ShareModal.tsx (sharing functionality)"
        echo "3. Fix BottomNavbar.tsx (always-visible navigation)"
        echo "4. Fix all 9 tab components (extensive use)"
        echo "5. Fix layout.tsx meta tags (browser integration)"
        echo ""
        echo "**Estimated time**: 4-5 hours"
        echo ""
        echo "### Phase 2: High Priority (LAUNCH WEEK)"
        echo ""
        echo "1. Complete UploadDialog.tsx dark mode"
        echo "2. Add dark variants to status colors"
        echo "3. Fix gradients"
        echo ""
        echo "**Estimated time**: 4-5 hours"
        echo ""
        echo "### Phase 3: Polish (POST-LAUNCH)"
        echo ""
        echo "1. Optimize widget system"
        echo "2. Remove conflicting CSS rules"
        echo "3. Comprehensive testing"
        echo ""
        echo "**Estimated time**: 3-4 hours"
        echo ""
        echo "---"
        echo ""
        echo "## 🛠️ Quick Fixes"
        echo ""
        echo "Run bulk fix script:"
        echo ""
        echo "\`\`\`bash"
        echo "bash scripts/dark-mode-bulk-fix.sh"
        echo "\`\`\`"
        echo ""
        echo "**Note**: Review changes before committing!"
        echo ""
    } >> "$OUTPUT"

    echo ""
    echo -e "${GREEN}✅ Report saved to: $OUTPUT${NC}"
    echo ""
    echo "Summary:"
    echo "--------"
    echo -e "🚨 CRITICAL: ${RED}$CRITICAL${NC}"
    echo -e "⚠️  HIGH:     ${YELLOW}$HIGH${NC}"
    echo -e "📋 MEDIUM:   $MEDIUM"
    echo -e "━━━━━━━━━━━━━━━━━━"
    echo -e "   TOTAL:    ${RED}$TOTAL${NC}"
    echo ""
    echo "View full report:"
    echo "  cat $OUTPUT"
}

# Main execution
main() {
    check_critical_components
    check_high_priority
    check_medium_priority
    generate_summary

    # Open report if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo ""
        read -p "Open report in default viewer? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "$OUTPUT"
        fi
    fi
}

# Run
main
