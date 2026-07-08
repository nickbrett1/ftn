I'd like to create an article with a similar style (both the style of writing and the layout, fonts, styling etc..) to that in webapp/src/routes/building-with-ai/building-with-ai.svx that will discuss some surprising behavior from my use of autonomous agents, and a runaway charge. It would be nice if it could have a nice gimmick or meme to hook people in with an image - like we had for building-with-ai.svx. You can use a placeholder for the image - but give me a suggestion as to the one to use based on the article content.

I want you to create a first draft of this article under webapp/src/projects/agent-charges-surprise/agent-charges-surprise.svx

Here's the structure that I propose we follow along with notes for each section to use:

- Introduction. Introduce the article and provide some context. Highlight and link to the prior building-with-ai.svx article that my next challenge was to experiment with more autonomous agents. Specifically I wanted to setup openclaw and provide some color on what openclaw is. You could use mermaid to create a nice diagram to explain how it runs and what it does. My goal was at first to use it to better manage my NAS. Then lead into the hook, the problem, that is that I ran up very quickly, in a matter of minutes, an unexpected ~$50 agent API bill where my agent silently injected a massive data file into my prompt and when combined with delayed billing and some unexpected cache-write penalties from Google I rapidly racked up a large bill. This article acts as a mini-postmortem with five lessons learned to help anyone else avoid the same fate.

- Timeline. Here we need to get across the key chat events that led to my massive bill. We can start with some context that I started with the goal of doing some analysis of my ripped DVD collection and see if I could better encrypt the files.

It would be nice to show a total cost visially showing how costs increased through the timeline, and got to $44.08, i.e. maybe a total on the screen that appears in the top right or as a header that that increases as the user scrolls. It doesn't have to exactly match the timeline (though should start after step 2 and settle at step 4) but it would be a nice visual that as you go through time the costs were mounting, maybe they accelerate between step 3 and 4 below as well.

Each chat has below a timestamp, the chat I made, and the agent response. For each I've explained some commentary.

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
- **Context:** We'll need to do a callout for what tdarr is, but want to explain that although this failed initially (a clear hint that something was wrong, but I ignored) I asked again at 5:52 AM EDT. This query forced the agent to scrape logs and hit API endpoints, all while carrying the massive CSV payload, rapidly multiplying the token count and triggering cache-write penalties. For cache-write penalties from Google AI, it's interesting but not essential, can we do a callout to define these (or link to the later explanation).

4. The Compaction Intervention

- **Timestamp:** June 25, 2026 at 11:02 AM EDT
- **User:** "We just blasted through $10 in under 2 hours despite the improvements to reduce context. We’re clearly not spending low amount per turn as it’s only been this chat thread making requests. We have to fix this now."
- **Agent:** "To put an immediate stop to this token hemorrhage, we must execute two structural changes: #### Step A: We Need to Compact this Thread Immediately Our active trajectory file (`dd6a100d-3576-475a-9b51-5feb18b9ecf0.jsonl`) is bloated at **778 KB of raw historical exchanges**... I am going to force an immediate **Session Compaction** on our current thread. This will condense our entire 450-message history down into a tiny, lightweight narrative summary, dropping our active input tokens from **135,000 down to under 5,000 tokens**."
- **Context:** The automated compaction had failed to manage the structural bloat, forcing the agent to manually execute a truncation script to shrink the 135,000+ token active payload. This stopped the bleeding.

5. The Final Cost-Control Constraint

- **Timestamp:** June 25, 2026 at 11:06 AM EDT
- **User:** "Cool - can we also report the expected cost of each turn so I can more easily monitor this. And what’s the new compaction limits?"
- **Agent:** "Understood. I have manually configured your system limits directly inside the core configuration file (`/home/node/.openclaw/openclaw.json`) to force cost control. Here are your new context and compaction settings: - **Max Context Limit (`contextTokens`):** Reduced down to **65,000 tokens** (previously 1,000,000)..."
- **Context:** This was the structural fix that permanently stopped the drain. Under Gemini 3.5 Flash pricing ($1.50/1M input, $9.00/1M output), this limit keeps warm cached turns (benefiting from the 90% cache read discount) at around $0.03, while a cold start/uncached turn can cost up to ~$0.11, ensuring an average cost per turn of around or below $0.05 depending on cache efficiency.

- What did we learn, what could we have done to prevent this?

This section will go through lessons learned and actions to take to prevent a recurrence. I believe these lessons apply generally when working with LLM's, but particularly if costs are unbounded and the agent is semi-supervised or not supervised at all.

1. Guard Tool and Command Outputs

- **Action:** Prevent the agent from returning large raw datasets (like full CSVs or extensive log dumps) directly into the conversation history.
- **Rule:** If a script or command outputs a large volume of data, redirect that output to a file (e.g., `output.txt` or `/data/`) and have the agent print only a high-level summary (e.g., row count or top 5 lines) in the chat transcript to keep the active history lightweight.

2. Treat Heavy-Data Sessions as "Disposable"

- **Action:** Prevent the agent from continuing to send past context if the conversation changes to a new topic.
- **Rule:** If an agent performs a task that generates a significant file, consider the session "burned". Use commands like `/new`, `clear` or `/reset` to start a clean transcript.

3. Be extra vigilant when switching to payment mechanisms that do not have some form of rate limiting

- **Action:** Configure strict budget alerts, usage quotas, and hard spending limits directly within your LLM developer console (e.g., Google AI Studio, Google Cloud Console, or Vertex AI).
- **Rule:** Never execute autonomous agents or script loops using open-ended, pay-as-you-go API keys without billing safeguards. While consumer frontends or CLI sandboxes often enforce a natural rate limit (like Gemini's 5-hour window),
  direct API calls are unbounded—making cloud-level budget caps your only reliable safety net against runaway charges.

4. Don't Trust Agent-Reported Costs

The Scenario: The agent repeatedly assured me that the session was extremely cheap (citing base Gemini Flash rates), completely blind to the fact that the injected CSV payload were escalating actual costs.

- Action: Monitor API billing through cloud dashboards or independent framework wrappers rather than asking the agent for cost estimates.
- Rule: Treat any self-reported pricing claims made by the LLM with skepticism. Agents are blind to framework wrappers, system prompts, cache penalties, and workspace injections.

5. Treat Compaction Failures as an Immediate Stop-Work Signal

- **Action:** Treat any session errors or auto-compaction warnings (such as `⚠️ Auto-compaction could not recover this turn`) as a warning to immediately halt, inspect the trajectory, and manually purge the bloated data or reset the session.
- **Rule:** Never ignore framework warnings when auto-compaction fails. Summarization algorithms are designed for conversational text, not structured databases (like CSVs or log files). When they fail, the system falls back to carrying the
  raw, uncompressed payload, exponentially multiplying your costs on every subsequent message if you continue.
