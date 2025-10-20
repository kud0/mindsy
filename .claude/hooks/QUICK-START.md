# Quick Start Guide - Claude-Flow Git Hooks

## Overview

This hook system automatically commits agent work after task completion, integrating with claude-flow MCP tools.

## Installation (Already Complete!)

The hook system is already installed in your project:
- ✅ Hook scripts created and made executable
- ✅ Documentation written
- ✅ All agent files updated with workflow instructions
- ✅ Test script created and validated

## Quick Usage

### For Agents

When you complete a task, run:

```bash
# 1. Check changes
git status -s

# 2. Notify claude-flow
npx claude-flow@alpha hooks post-task --task-id "$(date +%s)" --description "what you did"

# 3. Commit automatically
bash .claude/hooks/post-agent-task.sh "your-agent-type" "task summary" "swarm-$(date +%s)"
```

### Agent Types

- `refactoring-specialist`
- `course-system-engineer`
- `social-features-engineer`
- `database-architect`
- `nextjs-fullstack-engineer`
- `qa-test-engineer`
- `performance-optimizer`
- `content-processor`
- `exam-generator`
- `productivity-tools-engineer`
- `ai-integration-specialist`
- `student-desk-ux-designer`

### Example Workflow

```bash
# Start task
bash .claude/hooks/pre-agent-task.sh "refactoring-specialist" "Remove legacy code"

# Do your work...
# Edit files, make changes, etc.

# Complete task
npx claude-flow@alpha hooks post-task --task-id "refactor-legacy" --description "Removed old Study Folders system"

bash .claude/hooks/post-agent-task.sh "refactoring-specialist" "Remove legacy Study Folders system" "swarm-001"

# Result: Automatic commit with formatted message
```

## Commit Message Format

All commits follow this format:

```
feat(agent-type): Brief description

🤖 Generated with Claude Code + claude-flow
Session: session-id
Agent: agent-type

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Available Files

### Hook Scripts
- `.claude/hooks/pre-agent-task.sh` - Pre-task validation
- `.claude/hooks/post-agent-task.sh` - Post-task commit
- `.claude/hooks/test-hooks.sh` - Validation tests

### Documentation
- `.claude/hooks/README.md` - Complete hook system docs
- `.claude/hooks/agent-workflow.md` - Detailed workflow guide
- `.claude/agent-workflow.md` - Master workflow guide
- `.claude/hooks/QUICK-START.md` - This file

### Agent Files (12 total)
All files in `.claude/agents/*.md` now include the git workflow footer.

## Testing

Run the validation tests:

```bash
bash .claude/hooks/test-hooks.sh
```

Expected output: All tests pass ✅

## Common Commands

### Pre-task (optional but recommended)
```bash
bash .claude/hooks/pre-agent-task.sh "agent-type" "task description"
```

### Post-task (required)
```bash
bash .claude/hooks/post-agent-task.sh "agent-type" "task summary" "session-id"
```

### Generate session ID
```bash
# Timestamp-based
SESSION_ID="swarm-$(date +%s)"

# Date-based
SESSION_ID="swarm-$(date +%Y%m%d)-001"

# Feature-based
SESSION_ID="swarm-social-features-001"
```

## Claude-Flow Integration

This hook system integrates with claude-flow MCP tools:

```bash
# Before task
npx claude-flow@alpha hooks pre-task --description "task name"

# After editing files
npx claude-flow@alpha hooks post-edit --file "path/to/file"

# After completing task
npx claude-flow@alpha hooks post-task --task-id "task-id" --description "what was done"

# End session
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Troubleshooting

### Permission denied
```bash
chmod +x .claude/hooks/*.sh
```

### No changes to commit
- Verify you actually made changes
- Check files aren't in `.gitignore`
- Ensure you're in the correct directory

### Git not configured
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## Best Practices

1. **One commit per task** - Not per file
2. **Descriptive messages** - Explain what and why
3. **Run pre-task first** - Validates environment
4. **Use same session ID** - For related tasks
5. **Verify before committing** - `git status -s`

## What's Next?

1. **Read full docs**: `.claude/hooks/README.md`
2. **Test with real agent**: Follow example workflow above
3. **Commit hook system**: These new files should be committed
4. **Use in production**: Integrate into your agent workflows

## Support

**Full Documentation**:
- Hooks: `.claude/hooks/README.md`
- Workflow: `.claude/hooks/agent-workflow.md`
- Master Guide: `.claude/agent-workflow.md`

**Claude-Flow**:
- GitHub: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues

## Summary

✅ **What was created:**
- 2 hook scripts (pre-task, post-task)
- 4 documentation files
- 1 test script
- Updated 12 agent files with git workflow footer

✅ **What it does:**
- Validates environment before tasks
- Automatically commits after task completion
- Generates consistent commit messages
- Integrates with claude-flow MCP tools
- Tracks agent sessions and work

✅ **Ready to use!**

Start using the hooks immediately with any agent workflow.

---

**Remember**: One task, one commit, clear description!
