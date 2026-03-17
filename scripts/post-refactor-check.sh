#!/bin/bash
# Post-Refactoring Validation Script
# Run this AFTER Copilot generates refactored code
# Usage: ./scripts/post-refactor-check.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "✅ POST-REFACTORING VALIDATION"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Load context
if [ ! -f ".refactor-context.json" ]; then
  echo "❌ No refactoring context found"
  echo "   Run pre-refactor-check.sh first"
  exit 1
fi

FEATURE_NAME=$(jq -r '.featureName' .refactor-context.json)
echo "Feature: $FEATURE_NAME"
echo ""

# 1. Check for anti-patterns
echo "1️⃣  Scanning for architecture violations..."
echo ""

VIOLATIONS=0

# Check for getServiceContainer()
echo "   Checking for getServiceContainer()..."
if grep -r "getServiceContainer()" src --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".spec.ts"; then
  echo "   ❌ Found getServiceContainer() calls"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "   ✅ No getServiceContainer() found"
fi

# Check for as any
echo "   Checking for 'as any' casts..."
AS_ANY_USAGE=$(grep -r " as any" src --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".spec.ts" || true)
if [ -n "$AS_ANY_USAGE" ]; then
  echo "   ⚠️  Found 'as any' casts (should be addressed):"
  echo "$AS_ANY_USAGE" | head -5
  echo "   (showing first 5 occurrences)"
else
  echo "   ✅ No 'as any' found"
fi

# Check for circular dependencies
echo "   Checking for potential circular dependencies..."
if grep -r "from.*handlers" src/orchestration --include="*.ts" 2>/dev/null || \
   grep -r "from.*handlers" src/application --include="*.ts" 2>/dev/null; then
  echo "   ⚠️  Potential circular dependencies detected"
  echo "   Review manually or ask Copilot to fix"
else
  echo "   ✅ No obvious circular dependencies"
fi

echo ""
echo "2️⃣  Running TypeScript compiler..."
if npx tsc --noEmit; then
  echo "✅ TypeScript compilation successful"
else
  echo "❌ TypeScript compilation failed"
  VIOLATIONS=$((VIOLATIONS + 1))
fi
echo ""

echo "3️⃣  Running ESLint..."
if npm run lint 2>/dev/null; then
  echo "✅ ESLint passed"
else
  echo "⚠️  ESLint found issues"
  echo "   Run: npm run lint -- --fix"
fi
echo ""

echo "4️⃣  Running Unit Tests..."
if npm test -- --passWithNoTests --coverage 2>/dev/null; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  echo "   Run: npm test"
  VIOLATIONS=$((VIOLATIONS + 1))
fi
echo ""

echo "5️⃣  Checking test coverage..."
COVERAGE=$(npm test -- --collectCoverageFrom='src/**/*.ts' --coverage=false 2>/dev/null || echo "unknown")
echo "✅ Coverage check done"
echo ""

echo "6️⃣  Showing code changes..."
echo ""
echo "📊 Files changed:"
git diff --name-status --no-color | head -20
echo ""

echo "📈 Diff stats:"
git diff --stat
echo ""

echo "7️⃣  Code diff (first 50 lines)..."
echo ""
git diff HEAD --no-color | head -50
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════"
if [ $VIOLATIONS -eq 0 ]; then
  echo "✅ POST-REFACTORING VALIDATION PASSED!"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo "✨ Code is ready!"
  echo ""
  echo "Next steps:"
  echo "  1. Review full diff: git diff"
  echo "  2. Run manual tests in VS Code Extension"
  echo "  3. Create pull request"
  echo "  4. Request code review"
  echo ""
else
  echo "⚠️  POST-REFACTORING VALIDATION FOUND ISSUES"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo "Issues: $VIOLATIONS"
  echo ""
  echo "Fix with:"
  echo "  npm run lint -- --fix"
  echo "  npm test"
  echo ""
  echo "Or ask Copilot to fix specific issues."
  echo ""
fi

# Create summary report
REPORT_FILE=".refactor-report-$FEATURE_NAME.json"
cat > "$REPORT_FILE" << EOF
{
  "feature": "$FEATURE_NAME",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "violations": $VIOLATIONS,
  "passed": $([ $VIOLATIONS -eq 0 ] && echo "true" || echo "false"),
  "checksPerformed": {
    "antiPatterns": "getServiceContainer, as any, circular deps",
    "typeScript": "tsc --noEmit",
    "lint": "npm run lint",
    "tests": "npm test",
    "coverage": "collected"
  }
}
EOF

echo "📄 Report saved: $REPORT_FILE"
echo ""
