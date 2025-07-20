#!/bin/bash

# Run wrangler login after container ports are available$
# wrangler login command is used to workaround https://github.com/cloudflare/workers-sdk/issues/5937
WEBAPP_DIR="/workspaces/ftn/webapp"
if [ -d "$WEBAPP_DIR" ]; then
	echo "INFO: Webapp directory found at $WEBAPP_DIR. Checking Wrangler login status..."
	( # Start a subshell to localize the cd
    cd "$WEBAPP_DIR"
    npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\.0\.0\.0/localhost/g'
    echo "INFO: Wrangler login process initiated."
	) # End subshell
else
  echo "INFO: Webapp directory not found at $WEBAPP_DIR, skipping Wrangler login."
fi