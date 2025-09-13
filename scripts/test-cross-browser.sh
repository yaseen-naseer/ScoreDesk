#!/bin/bash

# Cross-Browser Testing Script for ScoreDesk
# This script runs comprehensive cross-browser tests

set -e

echo "🚀 Starting Cross-Browser Testing for ScoreDesk"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    print_error "Playwright is not installed. Installing..."
    npm install -D @playwright/test
    npx playwright install
fi

# Check if dev server is running
print_status "Checking if dev server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    print_warning "Dev server is not running. Starting it..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    print_status "Waiting for dev server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            print_success "Dev server is running"
            break
        fi
        sleep 2
    done
    
    if ! curl -s http://localhost:3000 > /dev/null; then
        print_error "Failed to start dev server"
        exit 1
    fi
else
    print_success "Dev server is already running"
fi

# Run cross-browser tests
print_status "Running cross-browser compatibility tests..."

# Test 1: Basic cross-browser tests
print_status "Running basic cross-browser tests..."
npx playwright test tests/e2e/cross-browser.spec.ts --reporter=html

# Test 2: CSS compatibility tests
print_status "Running CSS compatibility tests..."
npx playwright test tests/e2e/css-compatibility.spec.ts --reporter=html

# Test 3: JavaScript compatibility tests
print_status "Running JavaScript compatibility tests..."
npx playwright test tests/e2e/javascript-compatibility.spec.ts --reporter=html

# Test 4: Browser-specific tests
print_status "Running browser-specific tests..."
npx playwright test tests/e2e/browser-specific.spec.ts --reporter=html

# Test 5: Accessibility tests (already exist)
print_status "Running accessibility tests..."
npx playwright test tests/e2e/accessibility.spec.ts --reporter=html

# Test 6: Run all tests across all browsers
print_status "Running comprehensive test suite across all browsers..."
npx playwright test --reporter=html

# Generate test report
print_status "Generating test report..."
npx playwright show-report

# Check test results
if [ $? -eq 0 ]; then
    print_success "All cross-browser tests passed! 🎉"
else
    print_error "Some tests failed. Check the report for details."
    exit 1
fi

# Cleanup
if [ ! -z "$DEV_PID" ]; then
    print_status "Stopping dev server..."
    kill $DEV_PID
fi

print_success "Cross-browser testing completed!"
echo "================================================"
echo "📊 Test results are available in the HTML report"
echo "🔍 Check playwright-report/index.html for detailed results"
echo "================================================"
