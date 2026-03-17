# Full Migration - Quick Start

You want to refactor **everything at once**. Here's how.

---

## ⚡ 30-Second Setup

```bash
# Navigate to project
cd ~/clientdata/github/vscode-extensions/http-forge

# Run setup script (creates directories + branch + baseline)
./scripts/full-migration.sh

# You'll see:
# ✅ Branch created: refactor/full-ddd-migration-[timestamp]
# ✅ Directories created
# ✅ Baseline captured
# ✅ Migration guide written

# Read the guide
cat .MIGRATION-GUIDE.md
```

**Done with setup!** Now 12 generations follow.

---

## 🎯 The 12 Generations (Copy-Paste Prompts)

Each prompt is in: `FULL-MIGRATION-12PART-PROMPTS.md`

### Generation Order:

1. **DTOs** (12 files) - All data models
2. **Request Commands** (5 files) - Execute, Save, Cookies, History, Variables  
3. **Environment Commands** (3 files) - Select, Manage, Config
4. **Collection Commands** (2 files) - Save, Update
5. **Suite Commands** (4 files) - Run, Save, Browse, Export
6. **Single Commands** (3 files) - Folder, Schema, OAuth2
7. **Request Handlers** (9 files) - All request-tester work
8. **Other Handlers** (6 files) - Environment, collection, suite, folder
9. **Loaders & Providers** (6 files) - Tree view decoupling
10. **All Tests** (60+ files) - Unit tests for everything
11. **Infrastructure** (3-4 files) - Event bus + DI updates
12. **Factories** (2-3 files) - Wiring + panel updates

**Total**: ~115 files, 23-28 hours

---

## 📋 For Each Generation:

```
1. Open FULL-MIGRATION-12PART-PROMPTS.md

2. Copy the prompt for Generation #N
   (e.g., "## GENERATION #1: DTOs")

3. Open Copilot Chat

4. Paste the entire prompt into Chat

5. Wait for code generation

6. After generation, run:
   npm test
   npm run type-check
   ./scripts/post-refactor-check.sh
   
7. If all pass, commit:
   git add src/
   git commit -m "[generation message from prompt]"

8. Move to next generation
```

---

## 🛑 Important Notes

### DON'T Skip Generations

Generations have dependencies:
- DTOs needed for Commands
- Commands needed for Handlers
- Handlers needed for Factories

### Run Validation After Each Generation

```bash
npm test                      # Must pass
npm run lint:architecture     # Should pass (if available)
./scripts/post-refactor-check.sh
```

### If Something Fails

1. Check the error
2. Review `COPILOT-CORRECTION.md` for common issues
3. Ask me to fix the specific violations
4. Continue to next generation

---

## 📊 Tracking Progress

Update this as you go:

```markdown
- [ ] Gen 1: DTOs (12 files)
- [ ] Gen 2: Request Commands (5 files)
- [ ] Gen 3: Environment Commands (3 files)
- [ ] Gen 4: Collection Commands (2 files)
- [ ] Gen 5: Suite Commands (4 files)
- [ ] Gen 6: Single Commands (3 files)
- [ ] Gen 7: Request Handlers (9 files)
- [ ] Gen 8: Other Handlers (6 files)
- [ ] Gen 9: Loaders & Providers (6 files)
- [ ] Gen 10: All Tests (60+ files)
- [ ] Gen 11: Infrastructure (3-4 files)
- [ ] Gen 12: Factories (2-3 files)
```

---

## 🚀 Getting Started NOW

### Option A: Start Immediately (Intensive)
- Spend 4-5 full days (23-28 hours)
- Do 2-3 generations per day
- Done by end of week

### Option B: Spread It Out (Relaxed)
- Spend 1-2 weeks
- Do 1 generation per day
- Easier to debug issues

### Option C: Do Phases in Parallel with Other Work
- Do one generation every few days
- Validate before moving on
- Flexible around other tasks

---

## 📂 All Reference Files

### Setup & Execution
- `FULL-MIGRATION-ROADMAP.md` - Timeline + Master prompt
- `FULL-MIGRATION-12PART-PROMPTS.md` - All 12 copy-paste prompts
- `scripts/full-migration.sh` - Automated setup

### Reference During Migration
- `REFACTORING-SYSTEM.md` - System overview
- `REFACTORING-SKILL-CARD.md` - Quick skills reference
- `COPILOT-CORRECTION.md` - Common mistakes & fixes
- `.vscode/.copilot-instructions` - Architecture rules
- `docs/CUSTOM-INSTRUCTIONS.md` - Detailed patterns

### Tracking
- `.migration-context.json` - Migration state
- `.MIGRATION-GUIDE.md` - Auto-created by setup
- `.migration-reports/[id]/progress-tracker.md` - Progress

---

## ✅ Success Checklist

When done, ALL of these should be true:

```
✅ 115 files created (85 in src/, 30 tests elsewhere)
✅ npm test passes (all tests pass, 80%+ coverage)
✅ npm run lint:architecture passes (if configured)
✅ npm run type-check passes (0 errors)
✅ npm run build succeeds
✅ No getServiceContainer() in new code
✅ No "as any" type casts in new code
✅ No circular dependencies
✅ All handlers in src/presentation/
✅ All commands in src/application/
✅ All DTOs in src/application/dto/
✅ All loaders in src/presentation/components/tree-providers/loaders/
✅ Event bus created and registered
✅ All panels using V2 handlers
✅ All tests in __tests__/ folders
✅ PR created and approved
✅ Merged to main
```

---

## 🆘 If You Get Stuck

### Common Issues

**"My DTOs have circular references"**
→ Check `COPILOT-CORRECTION.md` → Violation #3

**"Handler still uses getServiceContainer()"**
→ Check `COPILOT-CORRECTION.md` → Violation #1
→ Ask me: "Add ISomeService to constructor of [HandlerName]"

**"Type errors after generation"**
→ Check error messages carefully
→ Usually missing imports or type mismatches
→ Ask me to fix

**"Tests are failing"**
→ Check which tests fail
→ Usually mock setup issues
→ Ask me to fix

### Escalation Path

1. Check `COPILOT-CORRECTION.md` for the error
2. Review the file that has the error
3. Tell me specifically what's wrong
4. I'll generate or fix the problematic file

---

## 📞 You're Ready!

**Next Step**: Run setup

```bash
./scripts/full-migration.sh
```

**Then**: Follow Generation #1 from `FULL-MIGRATION-12PART-PROMPTS.md`

**Estimated Total Time**: 23-28 hours (4-7 days depending on pace)

**Let's go!** 🚀

---

**Quick Links**:
- Setup: `./scripts/full-migration.sh`
- Prompts: `FULL-MIGRATION-12PART-PROMPTS.md`
- Roadmap: `FULL-MIGRATION-ROADMAP.md`
- Fixes: `COPILOT-CORRECTION.md`
