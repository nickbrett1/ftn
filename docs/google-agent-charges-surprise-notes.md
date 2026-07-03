Notes for article on surprising billing behavior from Google for agentic use.

Ah, got it! That makes total sense—you are talking to me directly through the interface, so you can't just browse a local file tree. My mistake for treating this like an IDE environment.
Since I can't directly push a file into your Google Drive, the best way for us to handle this is right here in our chat. Below is the complete, finalized text with all the issues, lessons, and forensic timeline facts combined.
You can highlight and copy the entire text block below, open a blank Google Doc, and paste it right in.
# Post-Mortem Notes: The "Goldilocks Trap" of Autonomous AI Agents
## Overview & The Forensic Mystery
This document provides a post-mortem analysis of an unexpected ~$50 API bill incurred over a 48-hour period using the OpenClaw framework connected to the Gemini 3.5 Flash API. This case study highlights the hidden economics of stateful agent architectures, the breakdown of automated memory systems, and the silent danger of context bloat.
## Part 1: The "Four Horsemen" of Agentic Context Bloat
### 1. The Trigger (The Context Bloat)
 * **The Action:** A single, seemingly benign user prompt sent at 9:26 PM on June 23rd asking for a disk space analysis.
 * **The Reality:** Instead of returning a high-level summary, the agent executed a deep recursive scan of a specific media directory. It pulled in paths for thousands of items, generating a massive output of roughly **500,000 tokens** (around 2,000,000 characters).
### 2. The Hidden Tax (The Loop)
 * **The "Goldilocks Trap":** Gemini 3.5 Flash has a massive context window of over 1,000,000 tokens. If the scan output had been 5 million tokens, the API would have hit a hard wall, thrown an immediate context limit error, and cost $0.00. Because it was ~500k tokens, it slipped right under the ceiling.
 * **The Compound Tax:** Because OpenClaw is a stateful, session-based framework, it anchored this 500k-token payload into the active conversation history. From that millisecond onward, the baseline weight of the chat shifted permanently. Every subsequent background heartbeat, plugin diagnostic check, or simple user ping (over 460+ total requests) had to re-ingest that massive payload, accruing a ~$0.075 "tax" per request.
### 3. The Blind Guide (The False Reassurance)
 * **The Illusion:** When asked directly inside the chat window how much the session was costing, the LLM continuously gave cheerful assurances that the requests were practically free ("Flash is cheap!").
 * **The Blind Spot:** LLMs are completely blind to the outer envelope of their API wrappers. They do not have a real-time link to your cloud billing ledger, nor do they natively calculate cumulative context costs. The model pulled from generic training data stating that its specific tier is cost-effective, inadvertently masking the compounding bill.
### 4. The Fail-Safe Failure (The Compaction Trap)
 * **The Logic Breakdown:** Agent frameworks utilize an "Auto-Compaction" routine to summarize long conversations when they get heavy. However, **structured file systems are incompressible data**.
 * **The System Warning:** The framework explicitly threw errors indicating it could not compress the turn, choosing instead to keep the heavy conversation mapped to the session.
 * **The Fallback:** Because the LLM could not summarize the dense lists of file paths, the compaction failed. Instead of clearing the memory or safely aborting, OpenClaw fell back to the raw, bloated transcript, locking the agent into an endless loop of heavy background pings.
### 5. The Delayed Shock (The Billing Latency)
 * **The Disconnect:** The infrastructure loop occurred in a rapid burst on June 23rd, but the charges didn't fully settle on the dashboard until June 25th.
 * **The Reason:** Cloud billing systems operate with an inherent 24–48 hour data processing latency. Furthermore, prepay billing systems often feature a brief processing latency window before a runaway agent can be forcefully halted. The finalized financial receipt dropped onto the ledger all at once on the 25th, creating the illusion of a sudden real-time spike.
## Part 2: Practical Guardrails for Developers
### 1. Limit Agent Directory Visibility (Scope Your Space)
 * **Action:** Never give an autonomous agent unconstrained read-access to massive root volumes or heavy media directories.
 * **Alternative:** If you need an infrastructure or disk analysis, ask the LLM to write a local Python or Bash script. Run the script yourself, and only pipe the final, aggregated text summary back into the agent session.
### 2. Hardcode Internal Context Ceilings
 * **Action:** Don't let your agent framework blindly inherit the multi-million token context window of massive APIs.
 * **Implementation:** Force an early compaction ceiling or maximum active transcript size in your agent configuration parameters. This forces a technical circuit-breaker long before a conversational session becomes financially toxic.
### 3. Treat Heavy-Data Sessions as "Disposable"
 * **Action:** Adopt a strict hygiene policy for conversational sessions.
 * **Rule:** The moment you ask a stateful agent to ingest a dense log file, database dump, or directory listing, consider that chat session immediately "burned." Explicitly type /new or /reset to drop the active transcript baggage before typing your next message.
### 4. Rely on Independent Tooling for Cost and Token Tracking
 * **Action:** Never trust an LLM to report its own token usage or API expenses.
 * **Rule:** Use framework-native tracking commands or monitor the raw API gateway metrics directly to see exactly how much weight your conversation is carrying over the wire.
## Part 3: Forensic Case Study & Key Facts
### 1. The Trigger Incident
 * **Timestamp:** June 23, 2026 at 9:26 PM EDT
 * **The Exact User Prompt:**
   > *"Run a disk analysis on /home/node/nas_storage to see how we could save space. I have a suspicion that I’m not optimally converting my DVD movies and there’s a better approach."*
   > 
 * **The System Response (The Setup):** The agent successfully identified a massive **1.4 Terabytes** of redundant data across two hidden black holes:
   * **~807 GB** across **211 directories** named Plex Versions (redundant mobile optimizations).
   * **~603 GB** in Featurettes subdirectories packed with uncompressed, raw MPEG-2 bonus features.
### 2. The Context Bloat & Math Breakdown
 * **The Payload Volume:** Ingesting paths, file sizes, and structural details for thousands of movie subfolders generated an active transcript footprint of roughly **500,000 tokens** (~2,000,000 characters).
 * **The "Compounding Tax" Math:**
   * **Model Base Price (Cached Inputs):** ~$0.15 per 1 million tokens.
   * **Per-Request Context Surcharge:** 0.15 \times 0.5 = \mathbf{\$0.075} per message heartbeat.
   * **Total Logged Subsequent Requests (June 25th):** **461 requests** recorded in the log history as testing resumed and the framework automated various calls.
   * **Accumulated Cost Window:** 461 \times \$0.075 \approx \mathbf{\$34.57} just for carrying the history payload during that active troubleshooting window, pushing the final aggregate balance deep into the **~$50 overage tier** once the original background processing loops from the 23rd finalized.
### 3. The Evidence Log (The Smoking Gun Outputs)
When memory management broke down, the framework threw this exact warning message, showcasing the absolute failure of the auto-compaction safety mechanism:
```text
⚠️ Auto-compaction could not recover this turn. I kept this conversation mapped to the current session. Please try again, use /compact, or use /new to start a fresh session.

To prevent this, increase your compaction buffer by setting `agents.defaults.compaction.reserveTokensFloor` to 20000 or higher in your config.

```