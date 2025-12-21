I'd like to create an article with a similar style (both the style of writing and the layout, fonts, styling, etc..) to that in webapp/src/routes/dbt-duckdb/dbt-duckdb.svx as well as webapp/src/routes/building-with-ai/building-with-ai.svx that will discuss what I've learned using Spec Kit (https://github.com/github/spec-kit) - a framework that helps define specifications for projects that are then built with agents. Or perhaps more simply stated as structured approaches for vibe coding. 
Overall I struggled to utilise speckit well, but did learn many valuable lessons.
As before I'd like to use a nice meme to hook people with an image, like I used in the previously two articles.

I want you to create a first draft of this article under webapp/src/projects/speckit-dev/speckit-dev.svx

Here's the structure that I propose we follow along with notes for each section to use:

1. Explain speckit.

Let's intro by explaining a little about speckit amd linking to its github page (https://github.com/github/spec-kit). The idea of speckit is that it helps define the requirements for a project, along with the necessary constraints that need to be upheld.
I wanted to try speckit after my past experience with agents (https://fintechnick.com/projects/building-with-ai) to see if I could do better.

2. Explain the genproj project and why it seemed to be a good match for vibe coding and speckit.

Genproj (https://fintechnick.com/projects/genproj) is a small project to make it easier to generate a new github project with a selection of tools already configured that i find valuable. 
I feel I get a lot of benefit from things like containers for my development workflow, CI/CD setup, secrets management, and of course nowadays setting up agents.
Using an agent for this project seemed like a good match because:

2.1 All the tools I wanted to integrate had open APIs with online documentation. Understanding how to integrate with them isn't technically difficult, but it is time comsuming, so an agent should do this well.
2.2 The project could easily be decomposed. Every tool has a UI element, maybe some comfiguration for how it should be used, and them generates some code. Nice and repeatable for an agent.
2.3 The spec felt pretty easy to define, there wasn't much UI or obvious ambiguity.
2.4 It was a project that wasn't so small I could do it in a few prompts, but didn't seem so large that it would take a lot of effort to specify.

3. The speckit artifacts created

In this section let's show the two files we created (amd link to the files, amd we can inlcude snippets of content inline if it helps explain):

.specify/memory/constitution.md - this file defined all the principles that I didn't want the agents violating when creating the project. Things like code quality and testing.
Creating this was quite good fun, it made me think about how i developed software and i like the name 'constituion' as a way to enforce certain non-negotiables. 

specs/001-genproj/spec.md - next up was the specification for the project itself. This was longer than i expected, even for what i thought was a simple project.
As always having to actually write down the spec, really helped me crystalise what I wanted.

From here, it was over to speckit to generate a task breakdown to build it -> specs/001-genproj/tasks.md

4. Now we're onto how it went and lessons learned:

4.1 Agents can be expensive!

With speckit, agents are doing a lot more work. Of course this additional work is geared towards a higher quality result, breaking down tasks and validating work against the constitution.
But in around 2 to 3 ~2 hour sessions I had entirely exhausted my monthly cursor allowance ($20) and a topup ($10). The sums weren't huge but if I can be coding most nights and so I could see this becoming many hundreds of dollars a month. Enough to give pause.

Solution? Could we try to use different agents, some cheaper and less capable, for different speckit activities. Not everything needs the most advanced model, but it wasn't at all obvious how to do this.

4.2 Hard to iterate on specs

I had tried with this project to pick something manageable in scope and complexity and I was hoping the structured approach from speckit would help manage that as well.
But I still ran into problems. Primarily these were because I had missed out details in my specification. But because of that I wanted to just update my specs and add / remove some stuff.
But the workflow im speckit isn't really geared to this kind of iteration, and I found myself just deleting what had been produced and going back. This was a major reason costs exploded.

Solution? Helping coding agents work, and be aware of, iterative workflow, seems key. It's a hard state management proble, as it is for humans, but we'll need better approaches for this.

4.3 Big changes are difficult to manage

Even when I could get a large change that I was happy with, I would face the normal problems of how to merge that back into my main branch. 
All speckit changes for a given project go into a single branch, and when up you kickoff the implementation it powers forward.
This led to a lot of code being generated, maybe not all I wanted, and increased the chances of conflicts with the main branch.

Solution? A human doing this work would have more understanding as to when to pause, when maybe to split the work across multiple branches, when to suggest merging pieces back into main.
It seems we'll need more tooling for LLMs to do the same.

4.4 Conclusion was that speckit loosens the reins on LLMs but aims to provide strong guardrails with specificaitoms and the consitution. 
through my own use of the tool, i wasnt able to stop the LLMs from running amok though i do see the potential in the tool. 
I ended up taking some of the speckit code and then just iterating on it directly with my agent to complete the project.

5. A few other thoughts and lessons on agent tools from building this project:

* Tried antigravity - ran out of credits very quickly
* Tried Gemini - no strict limits, benfit
* Jules better than Cursor equivalent, didnt get stuck. but uses lots of memory and can lack feedback, eg slow. But cool bew features, eg suggestions
* MCP helped eg with sonarqube and svelte5
* Next - local LLM? Want to try a hardware project.