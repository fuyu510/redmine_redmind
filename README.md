# Redmine Redmind

Author mindmaps as plain indented bullet lists inside Redmine rich‑text fields.
In the editor they stay a readable list; in the rendered view they become an
interactive mindmap you can **pan, zoom and open fullscreen**. Hovering the
diagram reveals buttons to view it fullscreen or to edit it visually
(GitMind / FreeMind style) — and edits are saved straight back into the source.

Powered by [mind-elixir](https://github.com/ssshooter/mind-elixir-core) (MIT),
bundled — **no CDN, no build step, works offline**.

| In the editor | In the rendered view |
| --- | --- |
| You see the literal list inside `{{mindmap …}}` | You see an interactive diagram |

## Features

- **List in the editor, diagram in the view.** The mindmap body is a normal
  indented bullet list, so it diffs cleanly and survives wiki history.
- **Interactive diagram** on any page that renders wiki text (wiki pages,
  issues, notes, news, forum messages, documents …).
- **Navigate**: mouse‑wheel to zoom, drag the background to pan, automatic
  fit‑to‑view, and a one‑click **fullscreen** mode.
- **Dark / night mode** toggle, remembered per browser, for both the view and
  the editor.
- **High‑contrast, legible text** (dark on light, light on dark).
- **Visual editing** — hover, click the pencil, drag / add / rename / delete
  nodes, then **Save**. The change is written back to the underlying wiki page
  (new version) or issue (new journal).
- **Permission‑aware.** Edit affordances only appear when the current user may
  edit that object, and every save is re‑authorized server‑side.
- **Runs on Redmine 5.1 and 6.x; packaged for 7.0 gem installation.**

## Viewing & navigation

Available on every rendered diagram — no edit permission required:

- **Zoom** — mouse wheel while the pointer is over the diagram.
- **Pan** — click an empty area of the diagram and drag.
- **Fit** — the whole map is auto‑scaled to fit on load (and re‑fits if the
  page column finishes laying out or resizes).
- **Fullscreen** — the ⛶ button (top‑right, on hover) opens the map across the
  whole screen with a zoom toolbar, zoom/pan, and a night‑mode toggle; press
  `Esc` or **Close** to exit.
- **Night mode** — the moon/sun button in the fullscreen and editor header
  switches between light and dark themes; the choice is stored in the browser
  and reused everywhere.

Because the wheel zooms while hovering a diagram, move the pointer off it to
scroll the page normally.

## Editing

Hover the diagram and click the ✎ button (shown only if you may edit the
object) to open the fullscreen visual editor:

- Drag / add / rename / delete nodes, with undo and a right‑click context menu.
- Wheel to zoom, drag the background to pan, toolbar to lay out / fit.
- Toggle night mode.
- **Save** serializes the tree back to an indented bullet list and writes it
  into the source `{{mindmap}}` block.

## How it works

```
{{mindmap
- Project plan
  - Phase 1
    - Research
    - Prototype
  - Phase 2
}}
```

1. The `{{mindmap}}` macro body is extracted before the Markdown/Textile
   formatter runs (Redmine's `catch_macros`), so your list is never mangled and
   stays a list in the textarea.
2. In the rendered view the macro emits a container; the bundled JavaScript
   parses the list and renders it with mind‑elixir.
3. The editor serializes the edited tree back to an indented list and posts it
   to the plugin, which replaces **only** that `{{mindmap}}` block in the source
   and saves through Redmine's normal path (preserving history / journals).

## Syntax

````
{{mindmap
- Root
  - Child A
    - Leaf
  - Child B
}}
````

Optional arguments:

````
{{mindmap(My Title, height=520, direction=side)
- Root
  - Child
}}
````

| Argument | Values | Default | Meaning |
| --- | --- | --- | --- |
| *(first, unnamed)* | text | — | Title used when the list has several top‑level items |
| `height` | integer (px) | 460 | Diagram height in the rendered view |
| `direction` | `left` \| `right` \| `side` | `side` | Layout direction |
| `theme` | theme name | built‑in | Diagram theme |

- Indent with 2 spaces (or tabs). `-`, `*`, `+` bullets are all accepted.
- A single top‑level line becomes the root; multiple top‑level lines are grouped
  under a title root.
- Prefix with `!` (`!{{mindmap …}}`) to show the macro literally.

## Installation

Replace `<REDMINE>` with your Redmine root.

### Redmine 5.1.x (Rails 6.1 / Sprockets)

```bash
cd <REDMINE>/plugins
git clone https://github.com/fuyu510/redmine_redmind.git
cd <REDMINE>
bundle install
bundle exec rake redmine:plugins:migrate RAILS_ENV=production
bundle exec rake redmine:plugins:assets  RAILS_ENV=production
# restart Redmine
```

Plugin assets are also auto‑mirrored to `public/plugin_assets/` on boot; the
`assets` task is only needed for scripted deploys. After upgrading, hard‑refresh
the browser (Ctrl/Cmd+Shift+R) so the new JS/CSS is picked up.

### Redmine 6.x (Rails 7.2 / Propshaft)

```bash
cd <REDMINE>/plugins
git clone https://github.com/fuyu510/redmine_redmind.git
cd <REDMINE>
bundle install
bundle exec rake redmine:plugins:migrate RAILS_ENV=production
# restart Redmine (Propshaft auto‑precompiles plugin assets on startup)
```

### Redmine 7.0 (gem plugin)

When 7.0's gem plugin loader ships, add to `<REDMINE>/Gemfile.extension`:

```ruby
gem 'redmine_redmind'
```

then `bundle install` and restart. The gemspec exposes
`metadata["redmine_plugin_id"] = "redmine_redmind"` so Redmine loads it as a
plugin. The same checkout still works as a classic filesystem plugin on 5.1/6.x.

There are **no database migrations** — the `migrate` step above is a harmless
no‑op kept for habit.

## Where editing is enabled

Read‑only diagrams render everywhere wiki text is rendered. Visual editing +
save‑back is wired for:

| Context | Field | Saved as |
| --- | --- | --- |
| Wiki pages | page text | new wiki version |
| Issues | description | new issue journal |
| Issue notes | journal notes | updated note |

Other contexts render read‑only. The set is a small frozen registry
(`lib/redmine_redmind/registry.rb`) and is straightforward to extend.

## Security

- Edit affordances appear only when the user may edit the object, and the save
  endpoint **re‑checks permission server‑side** (`edit_wiki_pages` +
  page‑protection for wikis; `edit_issues` + workflow field locks for issues;
  note ownership / `edit_issue_notes` and private‑note visibility for journals).
- The target field is derived **server‑side from a frozen allowlist** — the
  client cannot choose which attribute (or object type) to write.
- Saves require login and are **CSRF‑protected** (the browser sends
  `X-CSRF-Token`).
- If the specific `{{mindmap}}` block changed under you since the editor was
  opened, the save is safely rejected (**409 conflict**) instead of
  overwriting. A topic containing the reserved `}}` sequence is rejected
  (**422**) so it can never break the macro boundary.

## Development

```bash
# Unit tests (pure Node, no dependencies)
node test/outline.test.js
node test/text_patcher_algorithm.test.js

# Manual browser harness (serves the real assets + a mock save endpoint)
node test/serve_harness.js   # then open http://127.0.0.1:4599/
```

The `test/` directory is excluded from the packaged gem.

## License

Released under the MIT License (see `LICENSE`). Bundles mind‑elixir, also MIT
(see `LICENSE-THIRD-PARTY`).
