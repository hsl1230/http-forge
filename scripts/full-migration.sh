#!/bin/bash
# Full-Migration Setup & Execution Script
# Orchestrates the complete DDD refactoring of HTTP Forge extension
# Usage: ./scripts/full-migration.sh

set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
MIGRATION_ID="full-ddd-$TIMESTAMP"
LOG_FILE=".migration-log-$MIGRATION_ID.txt"
REPORT_DIR=".migration-reports/$MIGRATION_ID"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         HTTP FORGE - FULL DDD MIGRATION SETUP              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
  exit 1
}

section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Initialize log
log "Starting Full DDD Migration Setup"
log "Migration ID: $MIGRATION_ID"
log "Log file: $LOG_FILE"

# ─────────────────────────────────────────────────────────────────
section "1️⃣  PRE-FLIGHT CHECKS"
# ─────────────────────────────────────────────────────────────────

log "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  error "Git has uncommitted changes. Please commit or stash first."
else
  success "Git is clean"
fi

log "Checking current branch..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "develop" ]; then
  warning "Not on main/develop branch: $BRANCH"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Migration cancelled"
  fi
fi

log "Running existing tests..."
if npm test -- --passWithNoTests 2>&1 | tee -a "$LOG_FILE"; then
  success "Existing tests pass"
else
  error "Tests are failing. Fix before migration."
fi

# ─────────────────────────────────────────────────────────────────
section "2️⃣  CREATING FEATURE BRANCH"
# ─────────────────────────────────────────────────────────────────

BRANCH_NAME="refactor/full-ddd-migration-$TIMESTAMP"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  warning "Branch already exists: $BRANCH_NAME"
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
  success "Created branch: $BRANCH_NAME"
fi

# ─────────────────────────────────────────────────────────────────
section "3️⃣  CREATING DIRECTORY STRUCTURE"
# ─────────────────────────────────────────────────────────────────

log "Creating presentation layer..."
mkdir -p src/presentation/webview/message-handlers/__tests__
mkdir -p src/presentation/components/tree-providers/loaders/__tests__
mkdir -p src/presentation/components/tree-providers/__tests__
mkdir -p src/presentation/components/panels
success "Presentation layer created"

log "Creating application layer..."
mkdir -p src/application/commands/request/__tests__
mkdir -p src/application/commands/environment/__tests__
mkdir -p src/application/commands/collection/__tests__
mkdir -p src/application/commands/suite/__tests__
mkdir -p src/application/commands/folder/__tests__
mkdir -p src/application/commands/schema/__tests__
mkdir -p src/application/commands/oauth2/__tests__
mkdir -p src/application/commands/graphql/__tests__
mkdir -p src/application/dto
mkdir -p src/application/interfaces
success "Application layer created"

log "Creating orchestration layer..."
mkdir -p src/orchestration/services/__tests__
mkdir -p src/orchestration/interfaces
success "Orchestration layer created"

log "Creating infrastructure updates..."
mkdir -p src/infrastructure/event-bus/__tests__
mkdir -p src/infrastructure/services
success "Infrastructure layer created"

# ─────────────────────────────────────────────────────────────────
section "4️⃣  CREATING BASELINE & CONTEXT"
# ─────────────────────────────────────────────────────────────────

log "Capturing baseline..."
BASELINE_DIR=.migration-baseline/$MIGRATION_ID
mkdir -p "$BASELINE_DIR"
cp -r src "$BASELINE_DIR/src-before"
success "Baseline captured: $BASELINE_DIR"

log "Creating migration context..."
mkdir -p "$REPORT_DIR"

cat > .migration-context.json << EOF
{
  "migrationId": "$MIGRATION_ID",
  "timestamp": "$TIMESTAMP",
  "branch": "$BRANCH_NAME",
  "baseline": "$BASELINE_DIR",
  "reportDir": "$REPORT_DIR",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phases": {
    "dtos": { "status": "pending", "files": 12 },
    "commands": { "status": "pending", "files": 19 },
    "handlers": { "status": "pending", "files": 19 },
    "loaders": { "status": "pending", "files": 3 },
    "tests": { "status": "pending", "files": 60 },
    "infrastructure": { "status": "pending", "files": 3 }
  }
}
EOF
success "Migration context created"

# ─────────────────────────────────────────────────────────────────
section "5️⃣  CREATING MIGRATION GUIDE"
# ─────────────────────────────────────────────────────────────────

cat > .MIGRATION-GUIDE.md << 'EOF'
# Full DDD Migration Guide

## ✅ Setup Complete

All directories created and baseline captured.

## 📋 Next Steps (In Order)

### Phase 1: Generation - DTOs (2 hours)
```bash
# Copy the MASTER PROMPT from FULL-MIGRATION-ROADMAP.md
# Constrain to: DTOs only (12 files)
# Paste into Copilot Chat
# Expected output: src/application/dto/*.ts (12 files)

npm test
./scripts/post-refactor-check.sh
git commit -m "refactor: create all DTOs"
```

### Phase 2: Generation - Commands (6 hours)
Generate in 5 sub-generations:
1. Request Commands (5) - Execute, Save, Cookies, History, Variables
2. Environment Commands (3) - Select, Manage, Config
3. Collection Commands (2) - Save, Update
4. Suite Commands (4) - Run, Save, Browse, Export
5. Single Commands (3) - Folder, Schema, OAuth2, GraphQL

For each: `npm test`, `./scripts/post-refactor-check.sh`, commit

### Phase 3: Generation - Handlers (5 hours)
Generate in 2 sub-generations:
1. Request Tester Handlers (9 files)
2. Other Handlers (6 files)

For each: `npm test`, validation, commit

### Phase 4: Generation - Loaders & Providers (3 hours)
```bash
# Model Loaders (3 files)
# Tree Providers V2 (3 files)

npm test
./scripts/post-refactor-check.sh
git commit -m "refactor: implement loaders and tree providers"
```

### Phase 5: Generation - Tests (8 hours)
```bash
# DTOs Tests (1 hour)
# Commands Tests (3 hours)
# Handlers Tests (3 hours)
# Loaders Tests (1 hour)

npm test -- --coverage
# Target: 80% coverage

git commit -m "refactor: add comprehensive test coverage"
```

### Phase 6: Updates - Infrastructure (2 hours)
```bash
# Event Bus implementation
# Update service-bootstrap.ts (new registrations)
# Create HandlerFactory V2
# Update panel registrations

npm run lint:architecture
npm test
git commit -m "refactor: update infrastructure and factories"
```

### Phase 7: Final Validation (1 hour)
```bash
./scripts/post-refactor-check.sh
npm run build
git log --oneline | head -20
# Ready for PR
```

## 📊 Tracking Progress

After each phase, check:

1. Tests pass: `npm test`
2. No violations: `npm run lint:architecture`
3. No errors: `npm run type-check`
4. Coverage: `npm test -- --coverage`

Results saved to: `.migration-reports/full-ddd-[timestamp]/`

## 🎯 Success Criteria

When ALL are green:
- [ ] Tests: 100% passing
- [ ] Coverage: 80%+
- [ ] No violations
- [ ] TypeScript: 0 errors
- [ ] Linting: 0 errors
- [ ] No getServiceContainer()
- [ ] No "as any" casts
- [ ] All new tests in __tests__/
- [ ] PR created and approved
- [ ] Merged to main

## 🆘 If Something Breaks

```bash
# Check current status
git status

# Review what changed
git diff HEAD

# See the log
cat .migration-log-full-ddd-[timestamp].txt

# Rollback to last good state
git reset --hard HEAD~1

# Or rollback to before migration
git checkout $ORIGINAL_BRANCH
rm -rf src/presentation src/application src/orchestration
cp -r .migration-baseline/full-ddd-[timestamp]/src-before/* src/
```

## 📝 Reference

- Roadmap: `FULL-MIGRATION-ROADMAP.md`
- Skills: `REFACTORING-SKILL-CARD.md`
- Templates: `REFACTORING-PROMPTS.md`
- Corrections: `COPILOT-CORRECTION.md`
- Master Prompt: `FULL-MIGRATION-ROADMAP.md` (bottom section)

---

**Status**: Setup complete, ready to begin Phase 1 with DTOs

**Estimated Duration**: 4-7 days total
**Daily Pace**: 1-2 phases per day for intensive, or spread over 1-2 weeks

---

Generated: $(date)
EOF

success "Migration guide created: .MIGRATION-GUIDE.md"

# ─────────────────────────────────────────────────────────────────
section "6️⃣  CREATING PROGRESS TRACKER"
# ─────────────────────────────────────────────────────────────────

cat > "$REPORT_DIR/progress-tracker.md" << 'EOF'
# Migration Progress Tracker

Date Started: $(date)
Migration ID: full-ddd-[timestamp]

## Phases

### Phase 1: DTOs ✅ Pending
- [ ] Generate all 12 DTO files
- [ ] All DTOs have Input interface + Output class
- [ ] All DTOs have factory methods
- [ ] All tests pass
- [ ] Coverage: 100%
- [ ] Committed

### Phase 2: Commands ✅ Pending
- [ ] Generate all 19 command files
  - [ ] Request commands (5)
  - [ ] Environment commands (3)
  - [ ] Collection commands (2)
  - [ ] Suite commands (4)
  - [ ] Single commands (3)
- [ ] All commands validate input
- [ ] All commands delegate to orchestrator
- [ ] All commands publish events
- [ ] All tests pass
- [ ] Coverage: 80%+
- [ ] All committed

### Phase 3: Handlers ✅ Pending
- [ ] Generate all 19 handlers V2
  - [ ] Request tester handlers (9)
  - [ ] Other handlers (6)
- [ ] All handlers use constructor DI
- [ ] All handlers have try-catch
- [ ] All tests pass
- [ ] Coverage: 80%+
- [ ] All committed

### Phase 4: Loaders & Providers ✅ Pending
- [ ] Generate 3 model loaders
- [ ] Generate 3 tree providers V2
- [ ] All loaders return plain objects
- [ ] All providers use loaders
- [ ] All tests pass
- [ ] Coverage: 80%+
- [ ] All committed

### Phase 5: Tests ✅ Pending
- [ ] Add 60+ test files
- [ ] DTO tests: 100% coverage
- [ ] Command tests: 80%+
- [ ] Handler tests: 80%+
- [ ] Loader tests: 80%+
- [ ] Overall coverage: 80%+

### Phase 6: Infrastructure ✅ Pending
- [ ] Event bus implementation
- [ ] Update service-bootstrap.ts
- [ ] Create HandlerFactory V2
- [ ] Update panel registrations
- [ ] All systems wired
- [ ] Tests pass
- [ ] Committed

### Phase 7: Validation ✅ Pending
- [ ] ./scripts/post-refactor-check.sh passes
- [ ] npm run lint:architecture passes
- [ ] npm run type-check passes
- [ ] npm test passes
- [ ] npm run build succeeds
- [ ] PR created
- [ ] PR reviewed
- [ ] PR merged

## Statistics

Total Files to Create: 85
Total Tests to Create: 60+

Progress: 0% (0/85 files)

Phase 1 Files: 0/12
Phase 2 Files: 0/19
Phase 3 Files: 0/19
Phase 4 Files: 6/6
Phase 5 Files: 0/60
Phase 6 Files: 0/3

## Issues Encountered

(None yet - first phase pending)

## Notes

- Setup completed: $(date)
- Ready to begin Phase 1
- Branch: refactor/full-ddd-migration-[timestamp]
- Baseline: .migration-baseline/full-ddd-[timestamp]/
EOF

success "Progress tracker created"

# ─────────────────────────────────────────────────────────────────
section "7️⃣  FINAL SUMMARY"
# ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ MIGRATION SETUP COMPLETE                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

cat << EOF
📋 What's Been Done:
  ✅ Git validation (clean status, can create branch)
  ✅ Tests validated (currently passing)
  ✅ Feature branch created: $BRANCH_NAME
  ✅ Directory structure created (6 layers)
  ✅ Baseline captured at: $BASELINE_DIR
  ✅ Migration context saved
  ✅ Migration guide created
  ✅ Progress tracker initialized

📂 New Directories Created:
  ✅ src/presentation/webview/message-handlers/
  ✅ src/presentation/components/tree-providers/
  ✅ src/application/commands/
  ✅ src/application/dto/
  ✅ src/orchestration/services/
  ✅ src/infrastructure/event-bus/

📝 Important Files:
  • .MIGRATION-GUIDE.md (Start here next!)
  • FULL-MIGRATION-ROADMAP.md (Master prompt + timeline)
  • .migration-context.json (Migration state)
  • $REPORT_DIR/progress-tracker.md (Track progress)
  • $LOG_FILE (Setup log)

🚀 Next Steps:

1. Read the migration guide:
   cat .MIGRATION-GUIDE.md

2. Start Phase 1 (DTOs):
   • Copy MASTER PROMPT from FULL-MIGRATION-ROADMAP.md
   • Paste into Copilot Chat
   • Expected: 12 DTO files generated
   • Verify: npm test

3. Continue phases 2-7 as documented

⏱️  Estimated Duration:
   • Intensive pace: 4-5 days
   • Normal pace: 1-2 weeks
   • Each phase: 1-8 hours

📊 Your Status:
  Branch: $BRANCH_NAME
  Baseline: Captured at $BASELINE_DIR
  Migration ID: $MIGRATION_ID
  Files to Create: 85 (0 created yet)
  Tests to Create: 60+ (0 created yet)

✨ You're Ready to Start Phase 1!

EOF

success "Setup complete. See .MIGRATION-GUIDE.md for next steps."

echo ""
log "Setup finished at $(date)"
log "Migration ID: $MIGRATION_ID"
log "All output logged to: $LOG_FILE"

# ─────────────────────────────────────────────────────────────────
# Final commands for user
# ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}💡 Quick Commands:${NC}"
echo "   cat .MIGRATION-GUIDE.md              # Read migration guide"
echo "   git status                           # Check current status"
echo "   git log --oneline | head -10         # See recent commits"
echo "   cat $LOG_FILE                        # Review setup log"
echo ""
echo -e "${YELLOW}🎯 Next: Copy MASTER PROMPT from FULL-MIGRATION-ROADMAP.md${NC}"
echo ""
