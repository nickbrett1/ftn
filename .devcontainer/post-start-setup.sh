#!/bin/bash
# This file is executed every time the dev container starts up or resumes.
# It automatically checks if tailscaled, sshd, and socat are running and starts them if not.

echo "INFO: Checking SSH service status..."
if ! pgrep -x sshd >/dev/null; then
    echo "INFO: SSH service not running. Starting it..."
    sudo service ssh start
fi

echo "INFO: Checking Tailscale status..."
if ! pgrep -x tailscaled >/dev/null; then
    echo "INFO: Tailscale daemon not running. Starting it..."
    sudo nohup setsid tailscaled --state=/var/lib/tailscale/tailscaled.state >/dev/null 2>&1 &
fi

echo "INFO: Checking socat tunnel status..."
if ! pgrep -f 'socat TCP-LISTEN:9222' >/dev/null; then
    echo "INFO: socat tunnel not running. Starting it..."
    nohup setsid socat TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222 >/dev/null 2>&1 &
fi

echo "INFO: Services check/startup complete."
