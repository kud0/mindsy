#!/bin/bash
# Script to add git workflow footer to all agent files

AGENTS_DIR="/Users/alexsolecarretero/Public/projects/mindsy/.claude/agents"

# Agent configurations: filename|agent-type|commit-prefix
declare -a AGENTS=(
  "course-system-engineer.md|course-system-engineer|feat"
  "social-features-engineer.md|social-features-engineer|feat"
  "database-architect.md|database-architect|feat"
  "nextjs-fullstack-engineer.md|nextjs-fullstack-engineer|feat"
  "qa-test-engineer.md|qa-test-engineer|test"
  "performance-optimizer.md|performance-optimizer|perf"
  "content-processor.md|content-processor|feat"
  "exam-generator.md|exam-generator|feat"
  "productivity-tools-engineer.md|productivity-tools-engineer|feat"
  "ai-integration-specialist.md|ai-integration-specialist|feat"
  "student-desk-ux-designer.md|student-desk-ux-designer|feat"
)

FOOTER_TEMPLATE='
---

## Post-Task Git Workflow

After completing your task, follow these steps to commit your changes:

### 1. Verify Your Changes

```bash
git status -s
```

### 2. Run Claude-Flow Post-Task Hook

```bash
npx claude-flow@alpha hooks post-task --task-id "AGENT_ID-$(date +%s)" --description "[what you did]"
```

### 3. Commit Changes

```bash
bash .claude/hooks/post-agent-task.sh "AGENT_TYPE" "[task summary]" "swarm-$(date +%s)"
```

### Commit Message Template

```
COMMIT_PREFIX(AGENT_TYPE): [Brief summary]

🤖 Generated with Claude Code + claude-flow
Agent: AGENT_TYPE

Changes made:
- [File/feature 1]
- [File/feature 2]
- [File/feature 3]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Example

```bash
# After completing task
bash .claude/hooks/post-agent-task.sh "AGENT_TYPE" "EXAMPLE_TASK" "swarm-001"
```

**Important**: Always provide a clear, descriptive commit message that explains WHAT was changed and WHY.

**Documentation**: See `.claude/hooks/agent-workflow.md` for complete workflow instructions.
'

# Function to generate footer for specific agent
generate_footer() {
  local agent_type=$1
  local commit_prefix=$2
  local agent_id=$(echo "$agent_type" | sed 's/-specialist//' | sed 's/-engineer//' | sed 's/-optimizer//' | sed 's/-processor//' | sed 's/-generator//' | sed 's/-architect//' | sed 's/-designer//')

  # Determine example task based on agent type
  local example_task
  case "$agent_type" in
    *refactoring*) example_task="Remove legacy Study Folders system" ;;
    *course*) example_task="Implement lecture-to-folder assignment" ;;
    *social*) example_task="Add real-time notification system" ;;
    *database*) example_task="Create shared_content table migration" ;;
    *nextjs*) example_task="Create share API endpoints" ;;
    *qa*) example_task="Add comprehensive test suite for social features" ;;
    *performance*) example_task="Optimize bundle size with code splitting" ;;
    *content*) example_task="Add PDF document processing pipeline" ;;
    *exam*) example_task="Implement AI-powered quiz generation" ;;
    *productivity*) example_task="Implement Pomodoro timer with study analytics" ;;
    *ai*) example_task="Add Grok AI integration for content generation" ;;
    *student-desk*) example_task="Redesign tab navigation for better mobile UX" ;;
    *) example_task="Complete assigned task" ;;
  esac

  echo "$FOOTER_TEMPLATE" | \
    sed "s/AGENT_TYPE/$agent_type/g" | \
    sed "s/AGENT_ID/$agent_id/g" | \
    sed "s/COMMIT_PREFIX/$commit_prefix/g" | \
    sed "s/EXAMPLE_TASK/$example_task/g"
}

echo "Adding git workflow footer to agent files..."
echo ""

for config in "${AGENTS[@]}"; do
  IFS='|' read -r filename agent_type commit_prefix <<< "$config"
  filepath="$AGENTS_DIR/$filename"

  # Check if file exists
  if [ ! -f "$filepath" ]; then
    echo "⚠️  File not found: $filename"
    continue
  fi

  # Check if footer already exists
  if grep -q "## Post-Task Git Workflow" "$filepath"; then
    echo "✓ $filename already has git workflow footer"
    continue
  fi

  # Generate and append footer
  footer=$(generate_footer "$agent_type" "$commit_prefix")
  echo "$footer" >> "$filepath"

  echo "✓ Added footer to $filename"
done

echo ""
echo "Done! All agent files updated."
