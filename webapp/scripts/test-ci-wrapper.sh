#!/bin/bash

# Test CI Wrapper Script
# This script wraps the vitest command to capture and debug exit codes

set -e

echo "=== Starting Test CI Wrapper ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Environment: $CI"
echo "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# Check system resources
echo "=== System Resources ==="
echo "Memory:"
free -h || echo "free command not available"
echo "Disk space:"
df -h || echo "df command not available"
echo "CPU info:"
nproc || echo "nproc not available"

# Check for existing processes
echo "=== Existing Node processes ==="
ps aux | grep -E "(node|vitest)" | grep -v grep || echo "No existing Node processes found"

# Create reports directory if it doesn't exist
mkdir -p reports

# Clear any existing coverage files
echo "=== Cleaning up previous test artifacts ==="
rm -f ./reports/junit.xml
rm -rf ./coverage

# Run the vitest command and capture the exit code
echo "=== Running vitest command ==="
echo "Command: npm run test-ci"
echo "Start time: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

set +e  # Don't exit on error so we can capture the exit code
npm run test-ci
EXIT_CODE=$?
set -e  # Re-enable exit on error

echo "=== Vitest completed with exit code: $EXIT_CODE ==="
echo "End time: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# Check if JUnit XML file was created
if [ -f "./reports/junit.xml" ]; then
    echo "=== JUnit XML file exists ==="
    echo "File size: $(wc -c < ./reports/junit.xml) bytes"
    echo "File modification time: $(stat -c %y ./reports/junit.xml)"
    
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
    
    # Check for any skipped tests
    echo "=== Checking for skipped tests ==="
    grep -c 'skipped="1"' ./reports/junit.xml || echo "No skipped tests found"
    
    # Check for test timing issues
    echo "=== Checking for test timing ==="
    grep -o 'time="[^"]*"' ./reports/junit.xml | head -5
else
    echo "=== JUnit XML file NOT found ==="
fi

# Check coverage files
if [ -f "./coverage/lcov.info" ]; then
    echo "=== Coverage file exists ==="
    echo "Coverage file size: $(wc -c < ./coverage/lcov.info) bytes"
    echo "Coverage file modification time: $(stat -c %y ./coverage/lcov.info)"
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

# Check for any zombie processes
echo "=== Checking for zombie processes ==="
ps aux | grep -E "Z|defunct" || echo "No zombie processes found"

# Check system resources after tests
echo "=== System Resources After Tests ==="
echo "Memory:"
free -h || echo "free command not available"
echo "Disk space:"
df -h || echo "df command not available"

# Check for any file descriptor leaks
echo "=== Checking file descriptors ==="
lsof -p $$ 2>/dev/null | wc -l || echo "lsof not available"

# Check for any temporary files
echo "=== Checking for temporary files ==="
find /tmp -name "*vitest*" -o -name "*test*" 2>/dev/null | head -5 || echo "No temporary test files found"

echo "=== Test CI Wrapper completed ==="
echo "Final exit code: $EXIT_CODE"
echo "Final timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

# Exit with the same code as vitest
exit $EXIT_CODE