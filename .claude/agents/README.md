# Mindsy Project Agents

This directory contains specialized agents for the Mindsy project. Each agent is an expert in a specific domain and can be invoked to help with related tasks.

---

## 📱 Design Philosophy

**Mindsy is a MOBILE-FIRST application for Gen Z students.**

### Critical Priorities

All agents must prioritize:
1. **Mobile design (375px-428px) FIRST** - Not desktop, not tablet. Mobile.
2. **Touch-friendly interactions** - 44px minimum touch targets, thumb-zone navigation
3. **Bottom-zone navigation** - Critical actions at bottom of screen (one-handed use)
4. **Gen Z UX patterns** - Swipe gestures, instant feedback, Instagram/TikTok feel
5. **Desktop as enhancement** - Not primary target, only after mobile is perfect

### What This Means

**Before shipping ANY feature:**
- [ ] Tested on 375px viewport (iPhone SE) FIRST
- [ ] All touch targets are 44px minimum
- [ ] No hover-only interactions
- [ ] Bottom navigation/actions on mobile
- [ ] Smooth 60fps animations
- [ ] Feels native (not like a website)

### Mobile-First Resources

- **Complete checklist:** `.claude/mobile-first-checklist.md`
- **Each agent** has mobile-first requirements in their instructions
- **Testing:** Always test mobile FIRST, then tablet, then desktop

**If it doesn't work perfectly on a 375px iPhone, it's not ready to ship.**

---

## 🎯 Quick Reference

### Core Development (Use Most Frequently)
1. **nextjs-fullstack-engineer** - Full-stack Next.js/React development
2. **database-architect** - Database design, migrations, RLS policies
3. **ai-integration-specialist** - OpenAI, Grok, RunPod integration

### Testing & Quality
4. **qa-test-engineer** - Testing, bug fixes, quality assurance
5. **performance-optimizer** - Performance, bundle size, optimization

### Feature Specialists
6. **course-system-engineer** - Courses, folders, enrollments, templates
7. **content-processor** - File uploads, transcription, content generation
8. **exam-generator** - Exams, quizzes, assessments
9. **productivity-tools-engineer** - Pomodoro, tasks, scheduling, analytics
10. **social-features-engineer** - Friends, sharing, notifications, real-time

### Maintenance
11. **refactoring-specialist** - Code quality, refactoring, cleanup

---

## 📋 When to Use Each Agent

### Building a New Feature

**Example: Add quiz generation from lecture**

```
1. exam-generator (lead)
   ├─ ai-integration-specialist (generate questions)
   ├─ database-architect (create exam tables)
   ├─ nextjs-fullstack-engineer (build UI)
   └─ qa-test-engineer (test functionality)
```

### Fixing a Bug

```
1. qa-test-engineer (reproduce and fix)
   ├─ database-architect (if DB-related)
   └─ performance-optimizer (if performance-related)
```

### Optimizing Performance

```
1. performance-optimizer (identify issues)
   ├─ nextjs-fullstack-engineer (implement fixes)
   ├─ database-architect (optimize queries)
   └─ refactoring-specialist (clean up code)
```

---

## 🚀 How to Invoke Agents

### Method 1: Direct Invocation
```
Use the agent "nextjs-fullstack-engineer" to create a new dashboard page
```

### Method 2: Task-Based
```
Task: Build exam generation feature
Agents needed:
- exam-generator (lead)
- ai-integration-specialist
- database-architect
- nextjs-fullstack-engineer
```

### Method 3: Question-Based
```
How should I implement the Pomodoro timer?
→ Claude will invoke productivity-tools-engineer
```

---

## 🎯 Agent Collaboration Patterns

### Pattern 1: Feature Lead + Specialists
**Lead agent** coordinates work, other agents provide specialized help.

Example: `exam-generator` leads, uses `ai-integration-specialist` for questions, `database-architect` for schema.

### Pattern 2: Sequential Processing
Each agent completes their part before next agent starts.

Example: `database-architect` creates tables → `nextjs-fullstack-engineer` builds API → `qa-test-engineer` tests.

### Pattern 3: Parallel Work
Multiple agents work simultaneously on independent parts.

Example: `nextjs-fullstack-engineer` builds UI while `database-architect` designs schema.

---

## 📂 Agent Organization by Task Type

### New Feature Development
1. Choose feature specialist (course, content, exam, productivity, social)
2. Feature specialist coordinates with:
   - nextjs-fullstack-engineer (implementation)
   - database-architect (data layer)
   - ai-integration-specialist (AI features)
   - qa-test-engineer (testing)

### Bug Fixes
1. qa-test-engineer reproduces bug
2. Relevant specialist fixes (nextjs, database, ai-integration)
3. qa-test-engineer verifies fix

### Performance Issues
1. performance-optimizer identifies issues
2. Relevant specialists implement fixes
3. performance-optimizer verifies improvements

### Code Cleanup
1. refactoring-specialist analyzes code
2. nextjs-fullstack-engineer implements refactoring
3. qa-test-engineer ensures no regression

---

## 🔍 Finding the Right Agent

Ask yourself:

**What am I building?**
- Course feature → course-system-engineer
- Upload/processing → content-processor
- Quiz/exam → exam-generator
- Timer/tasks → productivity-tools-engineer
- Friends/sharing → social-features-engineer

**What am I fixing?**
- Bug → qa-test-engineer
- Slow performance → performance-optimizer
- Messy code → refactoring-specialist

**What technology?**
- Frontend/API → nextjs-fullstack-engineer
- Database → database-architect
- AI → ai-integration-specialist

---

## 📖 Documentation Links

Each agent has access to:
- `/CLAUDE.md` - Project overview
- `/docs/FOLDER-MANAGEMENT-SYSTEM.md` - Folder system
- `/.claude/social-features-overview.md` - Social features
- Agent-specific documentation listed in each agent file

---

## 🎓 Agent Expertise Summary

| Agent | Frontend | Backend | Database | AI | Testing |
|-------|----------|---------|----------|----|---------||
| nextjs-fullstack-engineer | ✅ Expert | ✅ Expert | ⚠️ Basic | ❌ | ❌ |
| database-architect | ❌ | ⚠️ Basic | ✅ Expert | ❌ | ❌ |
| ai-integration-specialist | ❌ | ⚠️ Basic | ❌ | ✅ Expert | ❌ |
| qa-test-engineer | ⚠️ Basic | ⚠️ Basic | ❌ | ❌ | ✅ Expert |
| performance-optimizer | ✅ Advanced | ✅ Advanced | ✅ Advanced | ❌ | ❌ |
| course-system-engineer | ✅ Advanced | ✅ Advanced | ⚠️ Basic | ⚠️ Basic | ❌ |
| content-processor | ⚠️ Basic | ✅ Advanced | ❌ | ✅ Advanced | ❌ |
| exam-generator | ✅ Advanced | ✅ Advanced | ⚠️ Basic | ✅ Advanced | ❌ |
| productivity-tools-engineer | ✅ Advanced | ✅ Advanced | ⚠️ Basic | ❌ | ❌ |
| social-features-engineer | ✅ Advanced | ✅ Advanced | ⚠️ Basic | ❌ | ❌ |
| refactoring-specialist | ✅ Expert | ✅ Expert | ❌ | ❌ | ⚠️ Basic |

✅ Expert | ✅ Advanced | ⚠️ Basic | ❌ Not their domain

---

## 💡 Pro Tips

1. **Start with feature specialists** - They know the domain best
2. **Let specialists collaborate** - Don't micromanage, let agents coordinate
3. **Use core agents for general work** - When unsure, start with nextjs-fullstack-engineer
4. **Test after every feature** - Always involve qa-test-engineer
5. **Optimize regularly** - Run performance-optimizer after major changes
6. **Refactor proactively** - Don't let technical debt accumulate

---

## 🔄 Typical Development Workflow

```
1. Feature Request
   ↓
2. Choose Feature Specialist
   ↓
3. Feature Specialist Plans Implementation
   ↓
4. Core Agents Implement
   - nextjs-fullstack-engineer (UI/API)
   - database-architect (schema)
   - ai-integration-specialist (AI features)
   ↓
5. qa-test-engineer Tests
   ↓
6. performance-optimizer Reviews
   ↓
7. Deployment
   ↓
8. refactoring-specialist Cleans Up (if needed)
```

---

**Remember:** Agents are here to help! Don't hesitate to invoke them for their expertise. They work best when collaborating together on complex features.

For questions about agent usage, refer to individual agent files or ask Claude to recommend the right agent for your task.
