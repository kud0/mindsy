# Claude-Flow Agent Workflow Guide

## Overview

This guide provides comprehensive instructions for using the agent system with automated git commits in the Mindsy project. It integrates Claude Code, claude-flow MCP tools, and git automation.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Agent Types](#agent-types)
3. [Complete Workflow](#complete-workflow)
4. [Hook System](#hook-system)
5. [Commit Guidelines](#commit-guidelines)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### For Agents

After completing your task:

```bash
# 1. Check changes
git status -s

# 2. Notify claude-flow
npx claude-flow@alpha hooks post-task --task-id "[task]" --description "[what you did]"

# 3. Commit automatically
bash .claude/hooks/post-agent-task.sh "[agent-type]" "[task-description]" "[session-id]"
```

### For Coordinators

When spawning agents:

```bash
# Initialize swarm
npx claude-flow@alpha hooks pre-task --description "Initialize agent swarm for [feature]"

# Spawn agents with full instructions including git workflow
# (See examples below)
```

## Agent Types

All available agents in the Mindsy project:

### Core Development
- `nextjs-fullstack-engineer` - Primary full-stack development
- `refactoring-specialist` - Code cleanup and optimization
- `performance-optimizer` - Performance improvements
- `qa-test-engineer` - Testing and QA

### Feature-Specific
- `course-system-engineer` - Course/folder management
- `social-features-engineer` - Social features (friends, sharing)
- `content-processor` - Content upload and processing
- `exam-generator` - Exam/quiz generation
- `productivity-tools-engineer` - Pomodoro, task management
- `ai-integration-specialist` - AI services (OpenAI, Grok, RunPod)

### Infrastructure
- `database-architect` - Database schema and migrations
- `student-desk-ux-designer` - Student Desk UI/UX

## Complete Workflow

### Phase 1: Planning (Coordinator)

```bash
# 1. Initialize session
SESSION_ID="swarm-$(date +%s)"

# 2. Run pre-task hook
npx claude-flow@alpha hooks pre-task --description "Implement [feature name]"

# 3. Create todos
# Use TodoWrite to create comprehensive task list (5-10+ items)

# 4. Spawn agents
# Use Task tool to spawn all agents in ONE message
```

### Phase 2: Execution (Individual Agents)

```bash
# 1. Pre-task setup
bash .claude/hooks/pre-agent-task.sh "[agent-type]" "[task-description]"

# 2. Do the work
# - Read files
# - Make changes
# - Test changes

# 3. Verify changes
git status -s
git diff

# 4. Notify claude-flow
npx claude-flow@alpha hooks post-task --task-id "[task-id]" --description "[what was accomplished]"

# 5. Commit changes
bash .claude/hooks/post-agent-task.sh "[agent-type]" "[task-description]" "$SESSION_ID"
```

### Phase 3: Completion (Coordinator)

```bash
# 1. Review all commits
git log --oneline -10

# 2. Run tests
npm run test
npm run build

# 3. End session
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Hook System

### Available Hooks

#### 1. Pre-Agent Task Hook
**Location**: `.claude/hooks/pre-agent-task.sh`

**Purpose**: Validates environment before agent starts

**Usage**:
```bash
bash .claude/hooks/pre-agent-task.sh "[agent-type]" "[task-description]"
```

**What it does**:
- Verifies git repository
- Shows current branch
- Displays current status
- Warns about uncommitted changes

#### 2. Post-Agent Task Hook
**Location**: `.claude/hooks/post-agent-task.sh`

**Purpose**: Commits changes after agent completes task

**Usage**:
```bash
bash .claude/hooks/post-agent-task.sh "[agent-type]" "[task-description]" "[session-id]"
```

**What it does**:
- Checks for changes
- Shows files to be committed
- Stages all changes
- Creates formatted commit message
- Commits changes
- Displays commit details

### Hook Integration with Claude-Flow

The git hooks work alongside claude-flow's built-in hooks:

```bash
# Claude-Flow Hooks (coordination)
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true

# Git Hooks (commits)
bash .claude/hooks/pre-agent-task.sh "[agent]" "[task]"
bash .claude/hooks/post-agent-task.sh "[agent]" "[description]" "[session]"
```

## Commit Guidelines

### Commit Message Format

```
feat(agent-type): Brief description (50 chars max)

🤖 Generated with Claude Code + claude-flow
Session: [session-id]
Agent: [agent-type]

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Commit Types

Use conventional commit prefixes:

- `feat(agent)` - New feature
- `fix(agent)` - Bug fix
- `refactor(agent)` - Code refactoring
- `perf(agent)` - Performance improvement
- `test(agent)` - Tests
- `docs(agent)` - Documentation
- `chore(agent)` - Maintenance

### Best Practices

**DO:**
- ✅ One commit per completed task
- ✅ Include all related files
- ✅ Use descriptive messages
- ✅ Run hooks in correct order
- ✅ Verify changes before committing

**DON'T:**
- ❌ Commit incomplete work
- ❌ Make commits for every file edit
- ❌ Use vague descriptions
- ❌ Commit unrelated changes together
- ❌ Skip the pre-task checks

## Examples

### Example 1: Refactoring Specialist

**Task**: Remove legacy Study Folders system

```bash
# Pre-task
bash .claude/hooks/pre-agent-task.sh "refactoring-specialist" "Remove legacy Study Folders system"

# Work done:
# - Deleted StudiesManager.tsx (540 lines)
# - Removed useStudyFolders.ts hook (124 lines)
# - Updated imports in DashboardWrapper.tsx

# Post-task
npx claude-flow@alpha hooks post-task --task-id "remove-study-folders" --description "Removed legacy Study Folders system"

bash .claude/hooks/post-agent-task.sh "refactoring-specialist" "Remove legacy Study Folders system" "swarm-001"
```

**Result**:
```
feat(refactoring-specialist): Remove legacy Study Folders system

🤖 Generated with Claude Code + claude-flow
Session: swarm-001
Agent: refactoring-specialist

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Example 2: Course System Engineer

**Task**: Implement lecture-to-folder assignment

```bash
# Pre-task
bash .claude/hooks/pre-agent-task.sh "course-system-engineer" "Implement lecture-to-folder assignment"

# Work done:
# - Created FolderSelector.tsx component
# - Added API endpoints: /api/folders/[id]/lectures
# - Created folder detail page
# - Updated database queries

# Post-task
npx claude-flow@alpha hooks post-task --task-id "lecture-folder-assignment" --description "Implemented lecture-to-folder assignment with UI and API"

bash .claude/hooks/post-agent-task.sh "course-system-engineer" "Implement lecture-to-folder assignment" "swarm-002"
```

**Result**:
```
feat(course-system-engineer): Implement lecture-to-folder assignment

🤖 Generated with Claude Code + claude-flow
Session: swarm-002
Agent: course-system-engineer

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Example 3: Social Features Engineer

**Task**: Add notification system

```bash
# Pre-task
bash .claude/hooks/pre-agent-task.sh "social-features-engineer" "Add real-time notification system"

# Work done:
# - Created NotificationBell.tsx component
# - Added Supabase Realtime subscription
# - Created notifications API endpoints
# - Added database migration for notifications table

# Post-task
npx claude-flow@alpha hooks post-task --task-id "notification-system" --description "Implemented real-time notification system with Supabase"

bash .claude/hooks/post-agent-task.sh "social-features-engineer" "Add real-time notification system" "swarm-003"
```

### Example 4: Multi-Agent Session

**Coordinator spawns 3 agents in one session**:

```bash
SESSION_ID="swarm-$(date +%s)"

# Agent 1: Database Architect
bash .claude/hooks/post-agent-task.sh "database-architect" "Create shared_content table migration" "$SESSION_ID"

# Agent 2: Social Features Engineer
bash .claude/hooks/post-agent-task.sh "social-features-engineer" "Implement content sharing UI" "$SESSION_ID"

# Agent 3: Next.js Fullstack Engineer
bash .claude/hooks/post-agent-task.sh "nextjs-fullstack-engineer" "Create share API endpoints" "$SESSION_ID"
```

**Git history shows**:
```
feat(nextjs-fullstack-engineer): Create share API endpoints (swarm-1729373456)
feat(social-features-engineer): Implement content sharing UI (swarm-1729373456)
feat(database-architect): Create shared_content table migration (swarm-1729373456)
```

## Troubleshooting

### Hook script not executable

**Problem**: `Permission denied` when running hook

**Solution**:
```bash
chmod +x .claude/hooks/post-agent-task.sh
chmod +x .claude/hooks/pre-agent-task.sh
```

### No changes to commit

**Problem**: Hook says "No changes to commit"

**Possible causes**:
- No files were actually modified
- Changes are in `.gitignore`
- Wrong working directory

**Solution**:
```bash
# Check status
git status -s

# Check ignored files
git status --ignored

# Verify working directory
pwd
```

### Commit failed

**Problem**: Git commit fails

**Possible causes**:
- Git not configured
- No write permissions
- Merge conflicts

**Solution**:
```bash
# Configure git
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Check for conflicts
git status

# Verify permissions
ls -la .git
```

### Claude-flow not found

**Problem**: `npx claude-flow@alpha` command fails

**Solution**:
```bash
# Install globally
npm install -g claude-flow@alpha

# Or use npx (no installation)
npx claude-flow@alpha --version
```

## Advanced Usage

### Custom Session IDs

Generate meaningful session IDs:

```bash
# Timestamp-based
SESSION_ID="swarm-$(date +%s)"

# Feature-based
SESSION_ID="swarm-social-features-001"

# Date-based
SESSION_ID="swarm-$(date +%Y%m%d)-001"
```

### Batch Operations

Multiple agents, one session:

```bash
SESSION_ID="swarm-$(date +%s)"

for agent in "agent-1" "agent-2" "agent-3"; do
  bash .claude/hooks/post-agent-task.sh "$agent" "Complete assigned task" "$SESSION_ID"
done
```

### Dry Run

Test without committing:

```bash
# Show what would be committed
git add .
git status
git reset
```

## Integration with Project

### File Organization

Remember project rules:
- Never save to root folder
- Use appropriate subdirectories (`/src`, `/tests`, `/docs`, etc.)
- Keep components under 500 lines

### Testing

Always test before committing:

```bash
# Run tests
npm run test

# Build check
npm run build

# Lint check
npm run lint
```

### Documentation

Update docs when needed:
- `CLAUDE.md` - Project instructions
- `.claude/*.md` - Agent documentation
- `docs/*.md` - Feature documentation

## Questions & Support

**Documentation**:
- `.claude/hooks/agent-workflow.md` - Detailed hook instructions
- `.claude/hooks/README.md` - Hook system documentation
- `/Users/alexsolecarretero/Public/projects/CLAUDE.md` - Project guidelines

**Claude-Flow**:
- GitHub: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

## Summary

This workflow ensures:
- ✅ Consistent commit messages
- ✅ Clear agent attribution
- ✅ Automated git operations
- ✅ Integration with claude-flow
- ✅ Easy tracking of agent work
- ✅ Professional git history

Remember: **One task, one commit, clear description!**
