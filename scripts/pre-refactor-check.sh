#!/bin/bash
# Pre-Refactoring Validation Script
# Run this BEFORE asking Copilot to refactor code
# Usage: ./scripts/pre-refactor-check.sh <feature-name>

set -e

FEATURE_NAME=$1
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

if [ -z "$FEATURE_NAME" ]; then
  echo "❌ Usage: ./scripts/pre-refactor-check.sh <feature-name>"
  echo "   Example: ./scripts/pre-refactor-check.sh cookie-handler"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "📋 PRE-REFACTORING VERIFICATION"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Check git status
echo "1️⃣  Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ ERROR: Uncommitted changes detected"
  echo "   Please commit or stash changes first"
  git status --short
  exit 1
fi
echo "✅ Git status clean"
echo ""

# 2. Verify we're on main or develop
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "develop" ] && [ "$CURRENT_BRANCH" != "dev" ]; then
  echo "⚠️  WARNING: Not on main/develop branch (current: $CURRENT_BRANCH)"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
echo "✅ Branch check passed"
echo ""

# 3. Run existing tests
echo "2️⃣  Running existing tests..."
if ! npm test -- --passWithNoTests 2>/dev/null; then
  echo "❌ Tests are failing"
  echo "   Fix tests before refactoring"
  exit 1
fi
echo "✅ Tests passing"
echo ""

# 4. Check dependencies are installed
echo "3️⃣  Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "⚠️  Installing dependencies..."
  npm install
fi
echo "✅ Dependencies installed"
echo ""

# 5. Run type check
echo "4️⃣  Running TypeScript check..."
if ! npx tsc --noEmit 2>/dev/null; then
  echo "⚠️  TypeScript compilation has errors (this is OK for refactoring)"
fi
echo "✅ TypeScript check done"
echo ""

# 6. Create feature branch
echo "5️⃣  Creating feature branch..."
BRANCH_NAME="refactor/$FEATURE_NAME-ddd"

if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  echo "⚠️  Branch already exists: $BRANCH_NAME"
  read -p "Use existing branch? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout "$BRANCH_NAME"
  else
    echo "❌ Aborted"
    exit 1
  fi
else
  git checkout -b "$BRANCH_NAME"
  echo "✅ Created branch: $BRANCH_NAME"
fi
echo ""

# 7. Capture baseline
echo "6️⃣  Capturing baseline for comparison..."
BASELINE_DIR=".refactor-baseline/$FEATURE_NAME-$TIMESTAMP"
mkdir -p "$BASELINE_DIR"
cp -r src "$BASELINE_DIR/src-before"
echo "✅ Baseline captured: $BASELINE_DIR"
echo ""

# 8. Create .env file for refactoring (optional)
cat > .refactor-context.json << EOF
{
  "featureName": "$FEATURE_NAME",
  "timestamp": "$TIMESTAMP",
  "branch": "$BRANCH_NAME",
  "baseline": "$BASELINE_DIR",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "✅ Context saved: .refactor-context.json"
echo ""

# 9. Show summary
echo "═══════════════════════════════════════════════════════════"
echo "✅ PRE-REFACTORING CHECKS PASSED!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Context:"
echo "   Feature: $FEATURE_NAME"
echo "   Branch: $BRANCH_NAME"
echo "   Baseline: $BASELINE_DIR"
echo ""
echo "🚀 Next steps:"
echo "   1. Ask Copilot to refactor with detailed prompt"
echo "   2. Run: ./scripts/post-refactor-check.sh"
echo "   3. Review changes: git diff"
echo "   4. Run tests: npm test"
echo ""
echo "Reference guides:"
echo "   • Architecture: .vscode/.copilot-instructions"
echo "   • Patterns: docs/CUSTOM-INSTRUCTIONS.md"
echo "   • Skills: REFACTORING-SKILL-CARD.md"
echo "   • Prompts: REFACTORING-PROMPTS.md"
echo ""
