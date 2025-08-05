#!/bin/bash

# Test CI Wrapper Script
# This script wraps the vitest command to capture and debug exit codes

set -e

echo "=== Starting Test CI Wrapper ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Environment: $CI"

# Check system resources
echo "=== System Resources ==="
echo "Memory:"
free -h || echo "free command not available"
echo "Disk space:"
df -h || echo "df command not available"
echo "CPU info:"
nproc || echo "nproc not available"

# Create reports directory if it doesn't exist
mkdir -p reports

# Run the vitest command and capture the exit code
echo "=== Running vitest command ==="
set +e  # Don't exit on error so we can capture the exit code
npm run test-ci
EXIT_CODE=$?
set -e  # Re-enable exit on error

echo "=== Vitest completed with exit code: $EXIT_CODE ==="

# Check if JUnit XML file was created
if [ -f "./reports/junit.xml" ]; then
    echo "=== JUnit XML file exists ==="
    echo "File size: $(wc -c < ./reports/junit.xml) bytes"
    
    # Check for failures in the XML
    if grep -q 'failures="0"' ./reports/junit.xml; then
        echo "=== No failures found in JUnit XML ==="
    else
        echo "=== Failures found in JUnit XML ==="
        grep 'failures=' ./reports/junit.xml
    fi
    
    if grep -q 'errors="0"' ./reports/junit.xml; then
        echo "=== No errors found in JUnit XML ==="
    else
        echo "=== Errors found in JUnit XML ==="
        grep 'errors=' ./reports/junit.xml
    fi
    
    # Check for any test suite failures
    echo "=== Checking for test suite failures ==="
    grep -A 5 -B 5 'failures="[1-9]' ./reports/junit.xml || echo "No test suite failures found"
    grep -A 5 -B 5 'errors="[1-9]' ./reports/junit.xml || echo "No test suite errors found"
else
    echo "=== JUnit XML file NOT found ==="
fi

# Check coverage files
if [ -f "./coverage/lcov.info" ]; then
    echo "=== Coverage file exists ==="
    echo "Coverage file size: $(wc -c < ./coverage/lcov.info) bytes"
else
    echo "=== Coverage file NOT found ==="
fi

# Check for any error logs
echo "=== Checking for error logs ==="
if [ -f "./reports/junit.xml" ]; then
    echo "Last 20 lines of JUnit XML:"
    tail -20 ./reports/junit.xml
fi

# Check for any vitest logs or error files
echo "=== Checking for vitest logs ==="
find . -name "*.log" -o -name "vitest-*.json" 2>/dev/null | head -10

# Check process list to see if any vitest processes are hanging
echo "=== Checking for hanging processes ==="
ps aux | grep -i vitest || echo "No vitest processes found"

echo "=== Test CI Wrapper completed ==="
echo "Final exit code: $EXIT_CODE"

# Exit with the same code as vitest
exit $EXIT_CODE