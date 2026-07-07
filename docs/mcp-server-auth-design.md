# MCP Server Authentication Design

## Overview

This document outlines the architecture and implementation details for exposing internal tools (like the Genproj code generator) as a Model Context Protocol (MCP) server securely over the internet.

## Problem Statement

AI agents (like Claude Desktop or Cursor) need to interact with the backend services. However, the existing web application relies on human-to-machine authentication via Google OAuth, which an AI agent cannot navigate. We need a way to transition from human-centric auth to machine-to-machine (M2M) auth while maintaining user identity.

## Architecture

1. **Personal Access Tokens (PATs)**
   - Authenticated users (via Google OAuth) can generate Personal Access Tokens from a new "API Keys" page (`/api-keys`).
   - Tokens are prefixed with `pat_` and are cryptographically secure random strings.
   - The raw token is displayed _once_ to the user.
   - The backend stores only a SHA-256 hash of the token in a Cloudflare D1 database table (`ApiKeys`), mapped to the user's email address.

2. **Machine-to-Machine (M2M) Authentication**
   - The AI client configures the remote MCP server URL (e.g., `https://www.fintechnick.com/api/mcp/sse`) and provides the PAT via the HTTP `Authorization` header (`Bearer <token>`).
   - The `ApiKeyService` validates the incoming token:
     1. Extracts the token from the header.
     2. Hashes the incoming token using SHA-256.
     3. Looks up the hash in the `ApiKeys` database.
     4. If a match is found, the associated user email is retrieved, and the `last_used_at` timestamp is updated.
     5. The user's identity is injected into the event context, allowing the standard SvelteKit API endpoints to function securely as if the user were logged in normally.

3. **Database Schema**
   ```sql
   CREATE TABLE IF NOT EXISTS ApiKeys (
       id TEXT PRIMARY KEY,
       user_email TEXT NOT NULL,
       hashed_key TEXT NOT NULL,
       name TEXT NOT NULL,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       last_used_at DATETIME
   );
   ```

## Security Considerations

- **No Plaintext Storage:** API keys are never stored in plaintext. If the database is compromised, the tokens cannot be reversed.
- **Revocability:** Users can revoke tokens at any time via the UI, immediately cutting off access.
- **HTTPS Only:** Tokens are transmitted exclusively over encrypted HTTPS connections.

## Local Development

To test the flow locally, users will need to:

1. Log in via Google to the local environment.
2. Generate an API Key in the UI.
3. Configure their local MCP client (e.g., `claude_desktop_config.json`) with the local SvelteKit server address and the generated Bearer token.
