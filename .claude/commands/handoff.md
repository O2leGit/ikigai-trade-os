Write a HANDOFF.md file to the project root capturing the current session's work. $ARGUMENTS can specify focus area (e.g. "engine work" or "dashboard fixes") -- defaults to everything.

Steps:
1. If HANDOFF.md already exists, copy it to HANDOFF-PREVIOUS.md as a backup before overwriting.
2. Run `git log --oneline -20` to see recent commits this session.
3. Run `git diff --stat HEAD~10` (adjust range to session commits) to see files changed.
4. Read memory files at `C:\Users\Chris\.claude\projects\C--Users-Chris-Documents-Trading-Strategy-Options\memory\MEMORY.md` for project context.
5. Check for any TODO comments or known issues in recently modified files.

Write `HANDOFF.md` in the project root with this structure:

```markdown
# Session Handoff -- [DATE]
> Last updated: [YYYY-MM-DD HH:MM]

## Completed This Session
- Bullet list of what was built, fixed, or changed
- Reference commit hashes where helpful

## Files Modified
- Group by area (engine/, dashboard/, config, etc.)
- Note new files vs modified files

## Key Decisions
- Architecture choices made and why
- Trade-offs accepted
- Things deliberately deferred

## Known Issues / Bugs
- Anything broken or partially working
- Error messages observed
- Things that need monitoring

## Next Steps
- What should happen in the next session
- Priority order if possible
- Any blockers or dependencies

## System State
- Current deployment status (VPS, Railway, etc.)
- Key metrics (routes, jobs, uptime, readiness)
- Any services that need attention
```

Keep it concise -- this is a quick reference for the next session, not a novel. Use the git history and conversation context to fill in accurately. If $ARGUMENTS specifies a focus area, narrow the scope accordingly.
