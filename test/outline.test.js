'use strict';

const assert = require('assert');
const { parseOutline, serializeOutline } = require('../assets/javascripts/mindmap_outline.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  ok - ' + name);
  } catch (err) {
    failed += 1;
    console.error('  FAIL - ' + name);
    console.error('        ' + err.message);
  }
}

function topics(node) {
  return {
    topic: node.topic,
    children: (node.children || []).map(topics)
  };
}

test('single root with nested children', function () {
  const res = parseOutline('- Root\n  - A\n    - A1\n  - B');
  assert.strictEqual(res.synthetic, false);
  assert.deepStrictEqual(topics(res.nodeData), {
    topic: 'Root',
    children: [
      { topic: 'A', children: [{ topic: 'A1', children: [] }] },
      { topic: 'B', children: [] }
    ]
  });
});

test('every node gets a unique id', function () {
  const res = parseOutline('- Root\n  - A\n  - B');
  const ids = [];
  (function collect(n) { ids.push(n.id); (n.children || []).forEach(collect); })(res.nodeData);
  assert.strictEqual(ids.length, 3);
  assert.strictEqual(new Set(ids).size, 3);
});

test('multiple top-level lines wrap in a synthetic root', function () {
  const res = parseOutline('- One\n- Two', { title: 'T' });
  assert.strictEqual(res.synthetic, true);
  assert.strictEqual(res.nodeData.topic, 'T');
  assert.strictEqual(res.nodeData.children.length, 2);
});

test('empty input yields a single titled root', function () {
  const res = parseOutline('   \n\n', { title: 'Empty Map' });
  assert.strictEqual(res.synthetic, false);
  assert.strictEqual(res.nodeData.topic, 'Empty Map');
  assert.deepStrictEqual(res.nodeData.children, []);
});

test('tabs are treated as indentation', function () {
  const res = parseOutline('Root\n\tChild\n\t\tGrand');
  assert.deepStrictEqual(topics(res.nodeData), {
    topic: 'Root',
    children: [{ topic: 'Child', children: [{ topic: 'Grand', children: [] }] }]
  });
});

test('lines without bullet markers still parse by indentation', function () {
  const res = parseOutline('Root\n  Child A\n  Child B');
  assert.deepStrictEqual(topics(res.nodeData), {
    topic: 'Root',
    children: [
      { topic: 'Child A', children: [] },
      { topic: 'Child B', children: [] }
    ]
  });
});

test('inconsistent indentation attaches to nearest shallower ancestor', function () {
  const res = parseOutline('- Root\n    - Deep\n  - Mid');
  assert.deepStrictEqual(topics(res.nodeData), {
    topic: 'Root',
    children: [
      { topic: 'Deep', children: [] },
      { topic: 'Mid', children: [] }
    ]
  });
});

test('serialize uses two-space indent and dash bullets', function () {
  const data = {
    id: 'r', topic: 'Root', children: [
      { id: 'a', topic: 'A', children: [{ id: 'a1', topic: 'A1', children: [] }] },
      { id: 'b', topic: 'B', children: [] }
    ]
  };
  assert.strictEqual(serializeOutline(data), '- Root\n  - A\n    - A1\n  - B');
});

test('serialize unwraps a synthetic root', function () {
  const data = { id: 'r', topic: 'wrapper', children: [
    { id: 'a', topic: 'One', children: [] },
    { id: 'b', topic: 'Two', children: [] }
  ] };
  assert.strictEqual(serializeOutline(data, { synthetic: true }), '- One\n- Two');
});

test('serialize ignores circular parent refs from a live editor', function () {
  const root = { id: 'r', topic: 'Root', children: [] };
  const child = { id: 'c', topic: 'Child', children: [], parent: root };
  root.children.push(child);
  assert.strictEqual(serializeOutline(root), '- Root\n  - Child');
});

test('round-trip is stable for a normalized outline', function () {
  const original = '- Project\n  - Phase 1\n    - Task A\n    - Task B\n  - Phase 2';
  const res = parseOutline(original);
  const out = serializeOutline(res.nodeData, { synthetic: res.synthetic });
  assert.strictEqual(out, original);
});

test('round-trip preserves structure for synthetic multi-root', function () {
  const original = '- One\n  - a\n- Two\n  - b';
  const res = parseOutline(original);
  const out = serializeOutline(res.nodeData, { synthetic: res.synthetic });
  assert.strictEqual(out, original);
});

test('topics with internal newlines are flattened to one line', function () {
  const res = parseOutline('- Root');
  res.nodeData.topic = 'Line1\nLine2';
  assert.strictEqual(serializeOutline(res.nodeData), '- Line1 Line2');
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
