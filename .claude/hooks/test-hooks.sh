#!/bin/bash
# Test script to validate the hook system

set -e

HOOKS_DIR="/Users/alexsolecarretero/Public/projects/mindsy/.claude/hooks"
AGENTS_DIR="/Users/alexsolecarretero/Public/projects/mindsy/.claude/agents"

echo "================================================"
echo "  Claude-Flow Hook System Validation"
echo "================================================"
echo ""

# Test 1: Check hook files exist
echo "Test 1: Verifying hook files exist..."
if [ -f "$HOOKS_DIR/pre-agent-task.sh" ] && [ -f "$HOOKS_DIR/post-agent-task.sh" ]; then
  echo "✓ Hook scripts found"
else
  echo "✗ Hook scripts missing"
  exit 1
fi

# Test 2: Check hooks are executable
echo ""
echo "Test 2: Verifying hooks are executable..."
if [ -x "$HOOKS_DIR/pre-agent-task.sh" ] && [ -x "$HOOKS_DIR/post-agent-task.sh" ]; then
  echo "✓ Hook scripts are executable"
else
  echo "✗ Hook scripts are not executable"
  echo "  Run: chmod +x .claude/hooks/*.sh"
  exit 1
fi

# Test 3: Check documentation exists
echo ""
echo "Test 3: Verifying documentation exists..."
if [ -f "$HOOKS_DIR/README.md" ] && \
   [ -f "$HOOKS_DIR/agent-workflow.md" ] && \
   [ -f "/Users/alexsolecarretero/Public/projects/mindsy/.claude/agent-workflow.md" ]; then
  echo "✓ All documentation files exist"
else
  echo "✗ Some documentation files are missing"
  exit 1
fi

# Test 4: Check all agent files have git workflow footer
echo ""
echo "Test 4: Verifying all agent files have git workflow footer..."
missing_footer=0
for agent_file in "$AGENTS_DIR"/*.md; do
  if [ "$agent_file" = "$AGENTS_DIR/README.md" ]; then
    continue
  fi

  filename=$(basename "$agent_file")
  if grep -q "## Post-Task Git Workflow" "$agent_file"; then
    echo "  ✓ $filename has git workflow footer"
  else
    echo "  ✗ $filename is missing git workflow footer"
    missing_footer=1
  fi
done

if [ $missing_footer -eq 1 ]; then
  echo "✗ Some agent files are missing the git workflow footer"
  exit 1
else
  echo "✓ All agent files have git workflow footer"
fi

# Test 5: Test pre-agent-task hook (dry run)
echo ""
echo "Test 5: Testing pre-agent-task hook..."
output=$(bash "$HOOKS_DIR/pre-agent-task.sh" "test-agent" "test task" 2>&1)
if [ $? -eq 0 ]; then
  echo "✓ pre-agent-task hook executed successfully"
else
  echo "✗ pre-agent-task hook failed"
  echo "$output"
  exit 1
fi

# Test 6: Test post-agent-task hook (dry run - no changes)
echo ""
echo "Test 6: Testing post-agent-task hook (no changes)..."
output=$(bash "$HOOKS_DIR/post-agent-task.sh" "test-agent" "test task" "test-session" 2>&1)
if echo "$output" | grep -q "No changes to commit"; then
  echo "✓ post-agent-task hook correctly detects no changes"
else
  echo "✗ post-agent-task hook did not detect absence of changes"
  exit 1
fi

# Test 7: Verify git repository status
echo ""
echo "Test 7: Verifying git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "✓ Git repository detected"
else
  echo "✗ Not a git repository"
  exit 1
fi

# Test 8: Check current git status
echo ""
echo "Test 8: Checking git status..."
git_status=$(git status -s)
if [ -n "$git_status" ]; then
  echo "⚠️  Warning: You have uncommitted changes"
  echo "   This is normal if you just installed the hook system"
  echo ""
  echo "Changed files:"
  git status -s | head -10
else
  echo "✓ Git working directory is clean"
fi

# Summary
echo ""
echo "================================================"
echo "  Validation Complete!"
echo "================================================"
echo ""
echo "✅ All tests passed successfully"
echo ""
echo "Next steps:"
echo "1. Review the documentation: .claude/hooks/README.md"
echo "2. Test with a real agent workflow"
echo "3. Commit these hook system files"
echo ""
echo "Example agent workflow:"
echo "  bash .claude/hooks/pre-agent-task.sh \"refactoring-specialist\" \"Remove legacy code\""
echo "  # ... do your work ..."
echo "  bash .claude/hooks/post-agent-task.sh \"refactoring-specialist\" \"Remove legacy code\" \"swarm-001\""
echo ""
