#!/bin/bash
# This file is executed every time the dev container starts up or resumes.
# It automatically checks if tailscaled, sshd, and socat are running and starts them if not.

echo "INFO: Checking SSH service status..."
if ! pgrep -x sshd >/dev/null; then
    echo "INFO: SSH service not running. Starting it..."
    sudo service ssh restart
fi

echo "INFO: Checking Tailscale status..."
if ! pgrep -x tailscaled >/dev/null; then
    echo "INFO: Tailscale daemon not running. Starting it..."
    sudo start-stop-daemon --start --background --oknodo --pidfile /var/run/tailscaled.pid --make-pidfile --exec /usr/sbin/tailscaled -- --state=/var/lib/tailscale/tailscaled.state
fi

echo "INFO: Checking socat tunnel status..."
if ! pgrep -f 'socat TCP-LISTEN:9222' >/dev/null; then
    echo "INFO: socat tunnel not running. Starting it..."
    sudo start-stop-daemon --start --background --pidfile /var/run/socat-9222.pid --make-pidfile --chuid node:node --exec /usr/bin/socat -- TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222
fi

echo "INFO: Checking Docsify status..."
if ! pgrep -f 'docsify serve' >/dev/null; then
    echo "INFO: Docsify not running. Starting it..."
    DOCSIFY_BIN=$(which docsify || echo "/usr/local/share/npm-global/bin/docsify")
    if [ -f "$DOCSIFY_BIN" ]; then
        sudo start-stop-daemon --start --background --oknodo --pidfile /var/run/docsify.pid --make-pidfile --chuid node:node --exec "$DOCSIFY_BIN" -- serve /workspaces/ftn/docs --port 3000
    else
        echo "WARNING: docsify binary not found, skipping startup."
    fi
fi

echo "INFO: Services check/startup complete."

