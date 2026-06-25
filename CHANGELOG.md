# Changelog

## 1.0.0

Initial release.

- `{{mindmap}}` wiki macro that keeps an indented bullet list in the editor and
  renders it as an interactive mindmap diagram in the view.
- Bundled mind-elixir 5.13.0 (MIT) for read-only rendering and visual editing —
  no CDN, no build step.
- Hover-to-edit fullscreen overlay editor (drag / add / rename / delete nodes,
  undo, context menu) with save-back into the source.
- Interactive navigation in both the view and the editor: mouse-wheel zoom,
  background drag-to-pan, and automatic fit-to-view.
- Fullscreen mode for read-only diagrams (button next to the edit button).
- Dark / night mode toggle, persisted per browser, plus a high-contrast light
  theme for readability.
- Save-back wired for wiki pages, issue descriptions, and issue notes, with
  server-side permission re-checks, block-level conflict detection (409),
  reserved-sequence rejection (422), and CSRF protection.
- Runs as a filesystem plugin on Redmine 5.1 and 6.x; ships a gemspec with
  `redmine_plugin_id` metadata for Redmine 7.0 gem installation.
- English and Korean locales.
