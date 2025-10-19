#!/bin/bash
# Pre-agent task hook - initializes environment before agent starts
# Usage: ./pre-agent-task.sh "[agent-type]" "[task-description]"

set -e

AGENT_TYPE="${1:-unknown-agent}"
TASK_DESCRIPTION="${2:-starting task}"
TIMESTAMP=$(date +%s)

echo "================================================"
echo "  Claude-Flow Pre-Agent Task Hook"
echo "================================================"
echo "Agent Type: ${AGENT_TYPE}"
echo "Task: ${TASK_DESCRIPTION}"
echo "Timestamp: ${TIMESTAMP}"
echo "================================================"

# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Not a git repository"
  exit 1
fi

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
echo ""
echo "📍 Current branch: ${CURRENT_BRANCH}"

# Show current status
echo ""
echo "📊 Current status:"
git status -s

# Check for uncommitted changes (warning only, don't fail)
if [[ -n $(git status -s) ]]; then
  echo ""
  echo "⚠️  Warning: You have uncommitted changes"
  echo "   Consider committing or stashing them before proceeding"
fi

echo ""
echo "✅ Pre-task checks complete. Agent ${AGENT_TYPE} ready to start."
echo ""
