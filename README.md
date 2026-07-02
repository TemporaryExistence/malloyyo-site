# Malloyyo — site remake proposal

A redesign proposal for [malloyyo.vercel.app](https://malloyyo.vercel.app/), built around one goal:
**the site should teach you what "talking to your data" means** — by letting you do it, on the page.

## View it as a working site

**Live:** https://temporaryexistence.github.io/malloyyo-site/

Or run it locally — it is plain HTML/CSS/JS with **zero dependencies and no build step**:

```bash
git clone https://github.com/TemporaryExistence/malloyyo-site && cd malloyyo-site
python3 -m http.server 8000   # or: npx serve .   (or just open index.html)
```

## What's in it

- **A live sandbox** (`assets/sandbox.js`): a real, working subset of Malloy that runs entirely in the
  browser. Pick one of the three public datasets (`auto_recalls`, `baby_names`, `order_items`), click a
  ★ question, and the page walks the whole loop: *you ask in plain language → the Malloy your AI would
  compose → the SQL it compiles to → your answer*, computed live from your (editable) query. The example
  questions are the real ones from the live site's dataset cards.
- **Data honesty:** the bundled samples are deterministic *synthetic* rows over each dataset's real
  schema — demo corpora, labeled as such in the UI. The live Malloyyo answers from real data.
- Sections teaching the rest of the story: how to serve a model (`malloyyo publish` / GitHub webhook),
  how to connect an MCP client, and the architecture from the upstream README.

## Provenance

Malloy and Malloyyo are [malloydata](https://github.com/malloydata) projects (MIT). This is a
design/UX proposal for the Malloyyo landing page — not a fork of the app — from Andrew Tabb's studio.
The design system carries Malloyyo's own identity (dark terminal-minimal, Geist Mono, the amber ★).
