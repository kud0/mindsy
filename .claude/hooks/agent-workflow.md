# Agent Git Workflow Instructions

## Overview

This document provides step-by-step instructions for agents to follow when completing tasks in the Mindsy project. Each agent should commit their changes after completing their assigned work.

## Post-Task Commit Protocol

After completing your assigned task, follow these steps:

### 1. Verify Your Changes

First, check what files you've modified:

```bash
git status -s
```

Review the output to ensure all changes are intentional.

### 2. Run Claude-Flow Post-Task Hook

Notify the claude-flow system that your task is complete:

```bash
npx claude-flow@alpha hooks post-task --task-id "[task-name]" --description "[what you did]"
```

Example:
```bash
npx claude-flow@alpha hooks post-task --task-id "refactor-study-folders" --description "Removed legacy Study Folders system"
```

### 3. Commit Your Changes

Run the post-agent-task hook to automatically commit your changes:

```bash
bash .claude/hooks/post-agent-task.sh "[agent-type]" "[task-description]" "[session-id]"
```

Example:
```bash
bash .claude/hooks/post-agent-task.sh "refactoring-specialist" "Remove legacy Study Folders system" "swarm-001"
```

## Commit Message Format

The hook automatically generates commits in this format:

```
feat(agent-type): Brief description of what was done

🤖 Generated with Claude Code + claude-flow
Session: [session-id]
Agent: [agent-type]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Manual Commit Format (if not using hooks)

If you need to commit manually, use this template:

```
feat(agent-type): Brief summary of changes

🤖 Generated with Claude Code + claude-flow
Agent: [your-agent-type]
Session: [session-id]

Changes made:
- [File/feature 1]: [what changed]
- [File/feature 2]: [what changed]
- [File/feature 3]: [what changed]

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Agent Type Examples

Use these standardized agent type names:

- `refactoring-specialist` - Code cleanup and optimization
- `course-system-engineer` - Course/folder features
- `database-architect` - Database schema changes
- `nextjs-fullstack-engineer` - Full-stack features
- `qa-test-engineer` - Testing and QA
- `content-processor` - Content processing features
- `ai-integration-specialist` - AI service integration
- `performance-optimizer` - Performance improvements
- `social-features-engineer` - Social features
- `exam-generator` - Exam/quiz features
- `productivity-tools-engineer` - Productivity features

## Complete Workflow Example

### Scenario: Refactoring Specialist removes old Study Folders system

**Step 1: Start task**
```bash
bash .claude/hooks/pre-agent-task.sh "refactoring-specialist" "Remove legacy Study Folders system"
```

**Step 2: Do the work**
- Delete `StudiesManager.tsx`
- Remove `useStudyFolders.ts` hook
- Update imports across codebase

**Step 3: Verify changes**
```bash
git status -s
# Output:
# D components/studies/StudiesManager.tsx
# D lib/hooks/useStudyFolders.ts
# M components/dashboard/DashboardWrapper.tsx
```

**Step 4: Complete task**
```bash
# Notify claude-flow
npx claude-flow@alpha hooks post-task --task-id "remove-study-folders" --description "Removed legacy Study Folders system"

# Commit changes
bash .claude/hooks/post-agent-task.sh "refactoring-specialist" "Remove legacy Study Folders system" "swarm-001"
```

**Result:**
```
✅ Changes committed successfully for refactoring-specialist task

📊 Commit details:
feat(refactoring-specialist): Remove legacy Study Folders system

🤖 Generated with Claude Code + claude-flow
Session: swarm-001
Agent: refactoring-specialist

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Best Practices

### DO:
- ✅ Commit after completing each distinct task
- ✅ Use descriptive task descriptions
- ✅ Verify changes before committing
- ✅ Include all related files in one commit
- ✅ Use the correct agent type name

### DON'T:
- ❌ Commit incomplete work
- ❌ Commit after every single file change
- ❌ Use vague descriptions like "updated files"
- ❌ Skip the claude-flow hooks
- ❌ Commit unrelated changes together

## Troubleshooting

### Hook script not executable
```bash
chmod +x .claude/hooks/post-agent-task.sh
chmod +x .claude/hooks/pre-agent-task.sh
```

### No changes to commit
If the hook says "No changes to commit", verify:
- You actually made changes
- Files aren't in `.gitignore`
- You're in the correct directory

### Commit failed
Check:
- Git is configured (`git config user.name` and `git config user.email`)
- You have write permissions
- No merge conflicts exist

## Advanced Usage

### Session Management

Generate unique session IDs:
```bash
SESSION_ID="swarm-$(date +%s)"
bash .claude/hooks/post-agent-task.sh "your-agent-type" "task description" "$SESSION_ID"
```

### Multiple Commits in One Session

If you need to make multiple commits in one session:
```bash
SESSION_ID="swarm-$(date +%s)"

# First task
bash .claude/hooks/post-agent-task.sh "agent-type" "Complete part 1" "$SESSION_ID"

# Second task
bash .claude/hooks/post-agent-task.sh "agent-type" "Complete part 2" "$SESSION_ID"
```

## Integration with Claude-Flow

This hook system integrates with claude-flow's built-in hooks:

```bash
# Before starting work
npx claude-flow@alpha hooks pre-task --description "[task]"

# During work
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"

# After completing work
npx claude-flow@alpha hooks post-task --task-id "[task]"

# Then commit
bash .claude/hooks/post-agent-task.sh "[agent]" "[description]" "[session]"
```

## Questions?

Refer to:
- `.claude/agent-workflow.md` - Master workflow guide
- `.claude/hooks/README.md` - Hook system documentation
- `/Users/alexsolecarretero/Public/projects/CLAUDE.md` - Project-wide guidelines
