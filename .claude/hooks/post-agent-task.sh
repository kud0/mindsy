#!/bin/bash
# Post-agent task hook - commits changes after agent completes
# Usage: ./post-agent-task.sh "[agent-type]" "[task-description]" "[session-id]"

set -e

AGENT_TYPE="${1:-unknown-agent}"
TASK_DESCRIPTION="${2:-completed task}"
SESSION_ID="${3:-session-$(date +%s)}"

echo "================================================"
echo "  Claude-Flow Post-Agent Task Hook"
echo "================================================"
echo "Agent Type: ${AGENT_TYPE}"
echo "Task: ${TASK_DESCRIPTION}"
echo "Session: ${SESSION_ID}"
echo "================================================"

# Check if there are changes to commit
if [[ -z $(git status -s) ]]; then
  echo "ℹ️  No changes to commit"
  exit 0
fi

# Show what will be committed
echo ""
echo "📝 Files to be committed:"
git status -s
echo ""

# Stage all changes
git add .

# Create commit message
COMMIT_MSG="feat(${AGENT_TYPE}): ${TASK_DESCRIPTION}

🤖 Generated with [Claude Code](https://claude.com/claude-code) + claude-flow
Session: ${SESSION_ID}
Agent: ${AGENT_TYPE}

Co-Authored-By: Claude <noreply@anthropic.com>"

# Commit changes
if git commit -m "$COMMIT_MSG"; then
  echo ""
  echo "✅ Changes committed successfully for ${AGENT_TYPE} task"
  echo ""
  echo "📊 Commit details:"
  git log -1 --stat
else
  echo ""
  echo "❌ Failed to commit changes"
  exit 1
fi
