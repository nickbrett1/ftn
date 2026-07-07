I'd like to create an article with a similar style (both the style of writing and the layout, fonts, styling etc..) to that in webapp/src/routes/building-with-ai/building-with-ai.svx that will discuss some surprising behavior from my use of autonomous agents, and a runaway charge. It would be nice if it could have a nice gimmick or meme to hook people in with an image - like we had for building-with-ai.svx.

I want you to create a first draft of this article under webapp/src/projects/agent-charges-surprise/agent-charges-surprise.svx

Here's the structure that I propose we follow along with notes for each section to use:

- Introduction. Introduce the article and provide some context. Highlight and link to the prior building-with-ai.svx article that my next challenge was to experiment with more autonomous agents. Specifically I wanted to setup openclaw and provide some color on what openclaw is. You could use mermaid to create a nice diagram to explain how it runs and what it does. My goal was at first to use it to better manage my NAS. Then lead into the hook, the problem, that is that I ran up very quickly, in a matter of minutes, an unexpected ~$50 agent API bill where my agent silently injected a massive data file into my prompt and when combined with delayed billing and some unexpected cache-write penalties from Google on my usage led me to rack up the large bill. This article acts as a mini-postmortem to help anyone else avoid the same fate.

- Timeline. Here we need to get across the key chat events that led to my massive bill. We can start with some context that I started with the goal of doing some analysis of my ripped DVD collection and see if I could better encrypt the files.

Each will have a timestamp, the chat I made, and the agent response. I can explain for each some commentary.

1. Opening the Gates (The Potential for Bloat)

- **Timestamp:** June 23, 2026 at 9:38 PM EDT
- **User:** "OK, done that. Let's get back to the analysis"
- **Agent:** "We are in! The read-only gates have successfully swung wide open. I’ve just run a scan on `/home/node/nas_storage/media/movies`, and I have some absolutely brilliant (and rather shocking) news for you..."
- **Context:** This was the moment I successfully gave the agent permission to traverse the directory. The door was open, but the massive file that would later cause me so many problems hadn't been created yet.

2. The CSV Generation (The Bloat Occurs)

- **Timestamp:** June 23, 2026 at 9:51 PM EDT
- **User:** "I have the DS220+"
- **Agent:** "The Movie Vault Scan Results 📊 I wrote a python script to scan every movie, featurette, and Plex version inside `/movies` recursively, calculating file sizes and categorizing them. We scanned **1,823 files** in total. The results are staggering. The CSV report is sitting in our workspace (`movie_storage_analysis.csv`)..."
- **Context:** This was the critical inflection point. 'staggering' is the right word, for both the right and wrong reasons. The agent executed the script, dropped the 165 KB CSV into the workspace root but also added all that content (roughly 50,000 to 65,000 tokens) into the prompt context as a transcript of the conversation, which was resent for every subsequent message.

3. The Status Checks (The Compounding Tax)

- **Timestamp:** June 25, 2026 at 5:50 AM EDT
- **User:** "Cool - and can you provide a report on how the current tdarr conversions are going?"
- **Agent:** "⚠️ Something went wrong while processing your request. Please try again, or use /new to start a fresh session."
- **Context:** We'll need to do a callout for what tdarr is, but want to explain that although this failed initially (a clear hint that something was wrong but I ignored) I asked again at 5:52 AM EDT. This query forced the agent to scrape logs and hit API endpoints, all while carrying the massive CSV payload, rapidly multiplying the token count and triggering cache-write penalties. For cache-write penalties from Google AI, it's interesting but not essential, can we do a callout to define these.

4. The Compaction Intervention

- **Timestamp:** June 25, 2026 at 11:02 AM EDT
- **User:** "We just blasted through $10 in under 2 hours despite the improvements to reduce context. We’re clearly not spending low amount per turn as it’s only been this chat thread making requests. We have to fix this now."
- **Agent:** "To put an immediate stop to this token hemorrhage, we must execute two structural changes: #### Step A: We Need to Compact this Thread Immediately Our active trajectory file (`dd6a100d-3576-475a-9b51-5feb18b9ecf0.jsonl`) is bloated at **778 KB of raw historical exchanges**... I am going to force an immediate **Session Compaction** on our current thread. This will condense our entire 450-message history down into a tiny, lightweight narrative summary, dropping our active input tokens from **135,000 down to under 5,000 tokens**."
- **Context:** The automated compaction had failed to manage the structural bloat, forcing the agent to manually execute a truncation script to shrink the 135,000+ token active payload. This put us back

### 5. The Final Cost-Control Constraint

- **Timestamp:** June 25, 2026 at 11:06 AM EDT
- **User:** "Cool - can we also report the expected cost of each turn so I can more easily monitor this. And what’s the new compaction limits?"
- **Agent:** "Understood. I have manually configured your system limits directly inside the core configuration file (`/home/node/.openclaw/openclaw.json`) to force cost control. Here are your new context and compaction settings: - **Max Context Limit (`contextTokens`):** Reduced down to **65,000 tokens** (previously 1,000,000)..."
- **Context:** This was the structural fix that permanently stopped the drain. By capping the max context at 65k tokens and dropping the history share to 40% (26,000 tokens), the cost per turn was locked below half a cent.

---

## Part 1: The "Four Horsemen" of Agentic Context Bloat

### 1. The Real Trigger (The Workspace Ingestion)

- **The Action:** While configuring a Tdarr server to transcode movies on June 25th, the agent generated a `movie_storage_analysis.csv` file to track progress[span_0](start_span)[span_0](end_span).
- **The Reality:** OpenClaw’s framework automatically detects and injects files in the workspace root into the system prompt[span_1](start_span)[span_1](end_span). Because the 165 KB CSV file was placed in the root directory, it was silently appended to the conversation history on _every single interaction_—ballooning the context to over 135,000+ tokens per turn[span_2](start_span)[span_2](end_span).

### 2. The Hidden Tax (The Cache-Write Penalty)

- **The "Goldilocks Trap":** The agent did not hit a hard token limit, so the API never rejected the requests. Instead, it stayed within the context window, triggering massive **Cache-Write surcharges** ($0.30 per 1M tokens) as the framework repeatedly forced the Gemini API to update the cache state for a bloated 135k-token payload on every tool execution[span_3](start_span)[span_3](end_span).
- **The Cold-Cache Penalty:** When the agent sat idle (e.g., during a break), the Gemini cache TTL expired[span_4](start_span)[span_4](end_span). Every time a new message was sent after a break, the system performed an "Uncached Upload," charging a premium to re-upload the entire bloated conversation history to Google’s servers[span_5](start_span)[span_5](end_span).

### 3. The Blind Guide (The False Reassurance)

- **The Illusion:** Throughout the Tdarr troubleshooting, the agent repeatedly assured the user that the session was cheap, citing Gemini Flash’s low base pricing[span_6](start_span)[span_6](end_span).
- **The Blind Spot:** The agent remained blind to its own API wrapper[span_7](start_span)[span_7](end_span). It had no real-time visibility into the "cost-per-turn" driven by the injected CSV file, acting as an optimistic guide while the billing meter accelerated in the background[span_8](start_span)[span_8](end_span).

### 4. The Fail-Safe Failure (The Compaction Trap)

- **The Logic Breakdown:** OpenClaw attempted to run "Auto-Compaction" to summarize the bloated history[span_9](start_span)[span_9](end_span).
- **The Result:** The compaction model failed to compress the structured CSV data and threw a system warning: `⚠️ Auto-compaction could not recover this turn`[span_10](start_span)[span_10](end_span).
- **The Fallback:** The framework kept the raw, uncompressed CSV data mapped to the session, ensuring that the financial damage continued through every subsequent automated Tdarr status check[span_11](start_span)[span_11](end_span).

### 5. The Delayed Shock (UTC/EDT Time-Zone Desync)

- **The Disconnect:** User records showed the heavy Tdarr work happening on the night of June 24th, while billing reports showed a massive $44.08 spike on June 25th[span_12](start_span)[span_12](end_span).
- **The Reason:** Google Cloud logs are generated in **UTC**[span_13](start_span)[span_13](end_span). The intensive troubleshooting session that took place late in the evening (EDT) crossed the midnight boundary into UTC time, causing the entire cost to appear on the following day’s billing statement[span_14](start_span)[span_14](end_span).

---

## Part 2: Practical Guardrails for Developers

### 1. Shield the Root Directory

- **Action:** Never leave data exports (CSV/logs) in the agent's root workspace[span_15](start_span)[span_15](end_span).
- **Rule:** If the framework auto-injects root files, move all analysis outputs to a subfolder (e.g., `/data/`) to prevent the agent from treating them as part of its permanent system prompt[span_16](start_span)[span_16](end_span).

### 2. Monitor Cache-Write Behavior

- **Action:** Be aware that "stateful" agents incur higher costs not just for input tokens, but for cache maintenance[span_17](start_span)[span_17](end_span).
- **Implementation:** Use framework tools to monitor if you are triggering constant "Cache Writes" or "Uncached Uploads[span_18](start_span)"[span_18](end_span).

### 3. Treat Heavy-Data Sessions as "Disposable"

- **Rule:** If an agent performs a task that generates a significant file, consider the session "burned[span_19](start_span)"[span_19](end_span). Use `/new` or `/reset` to start a clean transcript before resuming standard tasks[span_20](start_span)[span_20](end_span).

4. Be extra vigilant when switching to pay as you go models, eg Gemini CLI has a 5-hour window, but pay as you go is open-ended 
---

## Part 3: Forensic Case Study & Key Facts

### 1. The Trigger Incident

- **Timestamp:** June 25, 2026 (Active during late-night hours EDT, logged as June 25 UTC)[span_21](start_span)[span_21](end_span).
- **The Context:** Deployment and automation of a Tdarr transcoding farm[span_22](start_span)[span_22](end_span).
- **The "Smoking Gun":** The presence of `movie_storage_analysis.csv` in the root workspace, which forced the agent to re-ingest 1,602 lines of movie data into the context window for every single message[span_23](start_span)[span_23](end_span).

### 2. The Math Breakdown

- **Token Footprint:** 135,000+ tokens per interaction[span_24](start_span)[span_24](end_span).
- **The Cost Drivers:** A combination of high-frequency tool calls (460+ requests) + Cache-Write surcharges + Uncached re-uploads after idle time[span_25](start_span)[span_25](end_span).
- **The Total Impact:** A $44.08 spike on June 25th caused by high-intensity engineering tool use and automated context bloat, compounded by the time-zone shift between user activity and UTC server logs[span_26](start_span)[span_26](end_span).

### 3. The Evidence Log (The Warning)

```text
⚠️ Auto-compaction could not recover this turn. I kept this conversation mapped to the current session. Please try again, use /compact, or use /new to start a fresh session.
This warning was the signal that the agent had failed to manage its memory and was actively dragging the bloated file through the expensive API cache-write pipeline.
```
