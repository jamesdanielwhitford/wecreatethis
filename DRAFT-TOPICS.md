# Draft topics

Homepage sections/folders pulled off `content/home.md` on 2026-08-08, to be written about properly later. The underlying stub posts are still live at their real URLs, just not linked from the homepage.

## Mobile Application Development

- **Lotus** - `/lotus` - a stream-of-consciousness note-taking app with automatic note organisation.
- **HEAT** - `/heat` - tracks and plays the songs that push your workout harder.

## Modding

- **KindleWriter** - `/kindlewriter` - a KOReader extension for taking notes, navigating files, and serving this blog, straight from an e-reader.

## Agentic Engineering

- **Harness Customisation** - `/harness-customisation` - five sections, in order: goal, workflow, tools, files, and a closing instruction to keep all four current. The last section is what makes the first four maintainable by the agent that uses them.
- **Agent Hacking** - `/agent-hacking` - experimenting with corrupting and hijacking agent outputs.
- **Agent Programmatics** - `/agent-programmatics` - programmatic, API-driven control of agents.

## Re-adding to the homepage

Copy the matching `## Section` heading and its `` ```link:/{slug} `` blocks back into `content/home.md` (see `CLAUDE-blog.md` for the link-card syntax), then `node build.js`.
