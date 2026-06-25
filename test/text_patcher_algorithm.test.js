'use strict';

const assert = require('assert');

function normalize(str) {
  return String(str == null ? '' : str)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(function (l) { return l.replace(/\s+$/, ''); })
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
    .replace(/^\s+|\s+$/g, '');
}

// Mirrors RedmineRedmind::TextPatcher (Ruby). Group layout matches Redmine's
// MACROS_RE: [2] escape "!"  [4] name  [5] "(args)"  [7] block body.
function replaceBlock(source, original, newOutline, occurrence) {
  if (source == null) { return { result: source, found: false }; }
  if (/\}\}/.test(newOutline)) { throw new Error('InvalidOutline'); }
  const target = normalize(original);
  let seen = -1;
  let found = false;
  const re = /((!)?(\{\{(\w+)(\(([^\n\r]*?)\))?([\n\r][\s\S]*?[\n\r])?\}\}))/g;
  const result = source.replace(re, function (m, _g1, escaped, _g3, name, args, _g6, body) {
    if (escaped || String(name || '').toLowerCase() !== 'mindmap') { return m; }
    if (normalize(body) !== target) { return m; }
    seen += 1;
    if (!found && seen === occurrence) {
      found = true;
      return '{{mindmap' + (args || '') + '\n' + newOutline + '\n}}';
    }
    return m;
  });
  return { result: result, found: found };
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('  ok - ' + name); }
  catch (e) { failed += 1; console.error('  FAIL - ' + name + '\n        ' + e.message); }
}

test('replaces a block and leaves surrounding text byte-identical', function () {
  const src = 'Intro paragraph.\n\n{{mindmap\n- Root\n  - A\n}}\n\nOutro paragraph.';
  const out = replaceBlock(src, '- Root\n  - A', '- Root\n  - A\n  - B', 0);
  assert.strictEqual(out.found, true);
  assert.strictEqual(out.result, 'Intro paragraph.\n\n{{mindmap\n- Root\n  - A\n  - B\n}}\n\nOutro paragraph.');
});

test('preserves macro arguments', function () {
  const src = '{{mindmap(My Title, height=300)\n- Root\n}}';
  const out = replaceBlock(src, '- Root', '- Root\n  - Child', 0);
  assert.strictEqual(out.result, '{{mindmap(My Title, height=300)\n- Root\n  - Child\n}}');
});

test('never touches an escaped macro', function () {
  const src = '!{{mindmap\n- Root\n}}';
  const out = replaceBlock(src, '- Root', '- Changed', 0);
  assert.strictEqual(out.found, false);
  assert.strictEqual(out.result, src);
});

test('leaves other macros untouched', function () {
  const src = '{{collapse\n- Root\n}}\n{{mindmap\n- Root\n}}';
  const out = replaceBlock(src, '- Root', '- New', 0);
  assert.strictEqual(out.result, '{{collapse\n- Root\n}}\n{{mindmap\n- New\n}}');
});

test('targets the correct occurrence among identical blocks', function () {
  const src = '{{mindmap\n- Same\n}}\n---\n{{mindmap\n- Same\n}}';
  const out0 = replaceBlock(src, '- Same', '- First', 0);
  assert.strictEqual(out0.result, '{{mindmap\n- First\n}}\n---\n{{mindmap\n- Same\n}}');
  const out1 = replaceBlock(src, '- Same', '- Second', 1);
  assert.strictEqual(out1.result, '{{mindmap\n- Same\n}}\n---\n{{mindmap\n- Second\n}}');
});

test('reports not found when the original no longer matches', function () {
  const src = '{{mindmap\n- Changed by someone else\n}}';
  const out = replaceBlock(src, '- Original', '- New', 0);
  assert.strictEqual(out.found, false);
});

test('tolerates CRLF and trailing whitespace differences when matching', function () {
  const src = '{{mindmap\r\n- Root   \r\n  - A\r\n}}';
  const out = replaceBlock(src, '- Root\n  - A', '- Root\n  - A\n  - B', 0);
  assert.strictEqual(out.found, true);
});

test('rejects a new outline containing the reserved sequence', function () {
  assert.throws(function () {
    replaceBlock('{{mindmap\n- Root\n}}', '- Root', '- broken }} topic', 0);
  }, /InvalidOutline/);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
