# Claude-Flow Hooks System

## Overview

This directory contains git hooks for automating commits after agent tasks in the Mindsy project. The hooks integrate with claude-flow's MCP tools to provide seamless git automation.

## Available Hooks

### 1. `pre-agent-task.sh`

**Purpose**: Initialize environment and verify state before agent starts work

**Usage**:
```bash
bash .claude/hooks/pre-agent-task.sh "[agent-type]" "[task-description]"
```

**Example**:
```bash
bash .claude/hooks/pre-agent-task.sh "refactoring-specialist" "Remove legacy code"
```

**What it does**:
- Verifies git repository exists
- Shows current branch
- Displays current status
- Warns about uncommitted changes (warning only, doesn't block)

**Output**:
```
================================================
  Claude-Flow Pre-Agent Task Hook
================================================
Agent Type: refactoring-specialist
Task: Remove legacy code
Timestamp: 1729373456
================================================

📍 Current branch: main

📊 Current status:
M app/api/generate/route.ts
D components/old-component.tsx

⚠️  Warning: You have uncommitted changes
   Consider committing or stashing them before proceeding

✅ Pre-task checks complete. Agent refactoring-specialist ready to start.
```

### 2. `post-agent-task.sh`

**Purpose**: Commit all changes after agent completes task

**Usage**:
```bash
bash .claude/hooks/post-agent-task.sh "[agent-type]" "[task-description]" "[session-id]"
```

**Example**:
```bash
bash .claude/hooks/post-agent-task.sh "course-system-engineer" "Implement lecture assignment" "swarm-001"
```

**What it does**:
- Checks if there are changes to commit
- Shows files that will be committed
- Stages all changes (`git add .`)
- Creates formatted commit message
- Commits changes
- Displays commit details

**Output**:
```
================================================
  Claude-Flow Post-Agent Task Hook
================================================
Agent Type: course-system-engineer
Task: Implement lecture assignment
Session: swarm-001
================================================

📝 Files to be committed:
M app/api/folders/[folderId]/lectures/route.ts
A components/courses/LectureAssignment.tsx

✅ Changes committed successfully for course-system-engineer task

📊 Commit details:
feat(course-system-engineer): Implement lecture assignment
 2 files changed, 150 insertions(+)
```

**No changes output**:
```
ℹ️  No changes to commit
```

## Installation

### Make hooks executable

```bash
chmod +x .claude/hooks/pre-agent-task.sh
chmod +x .claude/hooks/post-agent-task.sh
```

### Verify installation

```bash
# Test pre-task hook
bash .claude/hooks/pre-agent-task.sh "test-agent" "test task"

# Test post-task hook (won't commit if no changes)
bash .claude/hooks/post-agent-task.sh "test-agent" "test task" "test-session"
```

## Commit Message Format

All commits follow this format:

```
feat(agent-type): Brief description of what was done

🤖 Generated with Claude Code + claude-flow
Session: [session-id]
Agent: [agent-type]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Type Prefixes

- `feat(agent)` - New feature
- `fix(agent)` - Bug fix
- `refactor(agent)` - Code refactoring
- `perf(agent)` - Performance improvement
- `test(agent)` - Tests
- `docs(agent)` - Documentation
- `chore(agent)` - Maintenance

## Agent Types

Use these standardized agent type names:

### Core Development
- `nextjs-fullstack-engineer`
- `refactoring-specialist`
- `performance-optimizer`
- `qa-test-engineer`

### Feature-Specific
- `course-system-engineer`
- `social-features-engineer`
- `content-processor`
- `exam-generator`
- `productivity-tools-engineer`
- `ai-integration-specialist`

### Infrastructure
- `database-architect`
- `student-desk-ux-designer`

See `.claude/agents/` for all available agents.

## Workflow Examples

### Basic Workflow

```bash
# 1. Start task
bash .claude/hooks/pre-agent-task.sh "refactoring-specialist" "Clean up imports"

# 2. Do the work
# ... make changes ...

# 3. Verify changes
git status -s

# 4. Complete task
bash .claude/hooks/post-agent-task.sh "refactoring-specialist" "Clean up imports" "swarm-001"
```

### Multi-Agent Session

```bash
SESSION_ID="swarm-$(date +%s)"

# Agent 1
bash .claude/hooks/post-agent-task.sh "database-architect" "Create migration" "$SESSION_ID"

# Agent 2
bash .claude/hooks/post-agent-task.sh "social-features-engineer" "Build UI" "$SESSION_ID"

# Agent 3
bash .claude/hooks/post-agent-task.sh "nextjs-fullstack-engineer" "Create API" "$SESSION_ID"
```

### With Claude-Flow Integration

```bash
# Full workflow with claude-flow hooks
npx claude-flow@alpha hooks pre-task --description "Implement notifications"

bash .claude/hooks/pre-agent-task.sh "social-features-engineer" "Implement notifications"

# Do work...

npx claude-flow@alpha hooks post-task --task-id "notifications" --description "Completed notification system"

bash .claude/hooks/post-agent-task.sh "social-features-engineer" "Implement real-time notifications" "swarm-001"
```

## Best Practices

### DO:
- ✅ Run pre-task hook before starting work
- ✅ Commit after completing each task
- ✅ Use descriptive task descriptions
- ✅ Verify changes with `git status` before committing
- ✅ Use the same session ID for related tasks
- ✅ Use correct agent type names

### DON'T:
- ❌ Commit incomplete work
- ❌ Commit after every single file change
- ❌ Use vague descriptions like "updated files"
- ❌ Skip the pre-task checks
- ❌ Commit unrelated changes together
- ❌ Hardcode session IDs

## Troubleshooting

### Permission denied

**Problem**: `Permission denied: ./post-agent-task.sh`

**Solution**:
```bash
chmod +x .claude/hooks/*.sh
```

### Hook not found

**Problem**: `No such file or directory`

**Solution**:
```bash
# Use absolute path
bash /Users/alexsolecarretero/Public/projects/mindsy/.claude/hooks/post-agent-task.sh ...

# Or cd to project root first
cd /Users/alexsolecarretero/Public/projects/mindsy
bash .claude/hooks/post-agent-task.sh ...
```

### No changes to commit

**Problem**: Hook says "No changes to commit" but you made changes

**Possible causes**:
1. Files are in `.gitignore`
2. Changes were already committed
3. Wrong working directory

**Solutions**:
```bash
# Check ignored files
git status --ignored

# Check for existing commits
git log -1

# Verify working directory
pwd
```

### Commit failed

**Problem**: Git commit fails with error

**Possible causes**:
1. Git not configured
2. No write permissions
3. Merge conflicts

**Solutions**:
```bash
# Configure git
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Check permissions
ls -la .git

# Resolve conflicts
git status
```

## Advanced Usage

### Generate Session IDs

```bash
# Timestamp
SESSION_ID="swarm-$(date +%s)"

# Date-based
SESSION_ID="swarm-$(date +%Y%m%d)-001"

# Feature-based
SESSION_ID="swarm-social-features-phase1"
```

### Dry Run (test without committing)

```bash
# Stage changes
git add .

# Review what would be committed
git status
git diff --cached

# Unstage (if not ready)
git reset
```

### Custom Commit Messages

If you need to customize the commit message, you can:

1. Use the hook and amend:
```bash
bash .claude/hooks/post-agent-task.sh "agent" "task" "session"
git commit --amend
```

2. Or commit manually following the format:
```bash
git add .
git commit -m "feat(agent-type): Description

🤖 Generated with Claude Code + claude-flow
Session: session-id
Agent: agent-type

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Integration Points

### Claude-Flow MCP Tools

These hooks work alongside claude-flow's built-in hooks:

```bash
# Before task
npx claude-flow@alpha hooks pre-task --description "[task]"

# During task
npx claude-flow@alpha hooks post-edit --file "[file]"

# After task
npx claude-flow@alpha hooks post-task --task-id "[task]"

# End session
npx claude-flow@alpha hooks session-end --export-metrics true
```

### Project Structure

Remember project organization rules:
- Never save to root folder
- Use `/docs` for documentation
- Use `/tests` for test files
- Keep components under 500 lines

### Testing

Always test before committing:
```bash
npm run test
npm run build
npm run lint
```

## File Structure

```
.claude/hooks/
├── README.md                  # This file
├── pre-agent-task.sh         # Pre-task initialization hook
├── post-agent-task.sh        # Post-task commit hook
└── agent-workflow.md         # Detailed workflow instructions
```

## Documentation

- **Hook instructions**: `agent-workflow.md`
- **Master workflow guide**: `../.claude/agent-workflow.md`
- **Project guidelines**: `/Users/alexsolecarretero/Public/projects/CLAUDE.md`
- **Mindsy project guide**: `/Users/alexsolecarretero/Public/projects/mindsy/CLAUDE.md`

## Support

**Claude-Flow**:
- GitHub: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

**Mindsy Project**:
- Project repo: `/Users/alexsolecarretero/Public/projects/mindsy`
- Documentation: `/Users/alexsolecarretero/Public/projects/mindsy/docs/`

## Summary

This hook system provides:
- ✅ Automated git commits after agent tasks
- ✅ Consistent commit message format
- ✅ Clear agent attribution
- ✅ Session tracking
- ✅ Integration with claude-flow
- ✅ Easy troubleshooting

**Remember**: One task, one commit, clear description!
