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
- **Real data:** `auto_recalls` and `baby_names` run on real public data (`assets/data-recalls.js` and
  `assets/data-names.js`, loaded on demand per dataset): the NHTSA recall flat files (1,500+ real vehicle
  campaigns since 1996, with real completion rates from NHTSA quarterly reports where filed) and the SSA
  by-state baby-names files (21,000+ real decade/state rows). Sources and the sampling rule are documented
  in each file's header. `order_items` is a deterministic synthetic demo corpus, labeled as such in the UI.
- Sections teaching the rest of the story: how to serve a model (`malloyyo publish` / GitHub webhook),
  how to connect an MCP client, and the architecture from the upstream README.

## Provenance

Malloy and Malloyyo are [malloydata](https://github.com/malloydata) projects (MIT). This is a
design/UX proposal for the Malloyyo landing page — not a fork of the app — from Andrew Tabb's studio.
The design system carries Malloyyo's own identity (dark terminal-minimal, Geist Mono, the amber ★).
