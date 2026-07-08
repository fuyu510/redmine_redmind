'use strict';

const assert = require('assert');

// Mirrors renderTopicHtml() in assets/javascripts/redmine_redmind.js.
// The node topic is rendered as HTML: every "#1234" becomes a link that
// opens the Redmine issue in a new tab, and everything else is escaped.
// The tooltip is "#1234" until the subject is resolved, then "#1234: subject".
const ISSUE_LINK_CLASS = 'redmind-issue-link';
const ISSUE_REF = /#(\d+)/g;

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function issueTitleText(cache, id) {
  const subject = cache[id];
  return (typeof subject === 'string' && subject) ? '#' + id + ': ' + subject : '#' + id;
}

function renderTopicHtml(topic, base, cache) {
  base = base || '/issues/';
  cache = cache || {};
  const text = String(topic == null ? '' : topic);
  let html = '';
  let last = 0;
  let match;
  ISSUE_REF.lastIndex = 0;
  while ((match = ISSUE_REF.exec(text)) !== null) {
    html += escapeHtml(text.slice(last, match.index));
    const label = match[0];
    const id = match[1];
    html += '<a class="' + ISSUE_LINK_CLASS + '" data-issue-id="' + escapeHtml(id) +
      '" href="' + escapeHtml(base + id) +
      '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(issueTitleText(cache, id)) + '">' +
      escapeHtml(label) + '</a>';
    last = match.index + label.length;
  }
  html += escapeHtml(text.slice(last));
  return html;
}

// Plain topic without a reference is escaped and left link-free.
assert.strictEqual(renderTopicHtml('just a topic'), 'just a topic');
assert.strictEqual(renderTopicHtml(''), '');
assert.strictEqual(renderTopicHtml(null), '');

// A single reference becomes a new-tab link to the issue, tagged with its id.
assert.strictEqual(
  renderTopicHtml('fix #1234 today'),
  'fix <a class="redmind-issue-link" data-issue-id="1234" href="/issues/1234" ' +
  'target="_blank" rel="noopener noreferrer" title="#1234">#1234</a> today'
);

// Multiple references in one topic are each linked.
assert.strictEqual(
  renderTopicHtml('#1 and #22'),
  '<a class="redmind-issue-link" data-issue-id="1" href="/issues/1" target="_blank" ' +
  'rel="noopener noreferrer" title="#1">#1</a> and ' +
  '<a class="redmind-issue-link" data-issue-id="22" href="/issues/22" target="_blank" ' +
  'rel="noopener noreferrer" title="#22">#22</a>'
);

// A relative_url_root prefix is honoured in the href.
assert.strictEqual(
  renderTopicHtml('see #7', '/redmine/issues/'),
  'see <a class="redmind-issue-link" data-issue-id="7" href="/redmine/issues/7" ' +
  'target="_blank" rel="noopener noreferrer" title="#7">#7</a>'
);

// Once the subject is cached, it is folded into the tooltip.
assert.strictEqual(
  renderTopicHtml('see #7', '/issues/', { '7': '로그인 화면 개선' }),
  'see <a class="redmind-issue-link" data-issue-id="7" href="/issues/7" ' +
  'target="_blank" rel="noopener noreferrer" title="#7: 로그인 화면 개선">#7</a>'
);

// A subject with HTML-significant characters is escaped inside the title.
assert.strictEqual(
  renderTopicHtml('#7', '/issues/', { '7': 'a<b> & "c"' }),
  '<a class="redmind-issue-link" data-issue-id="7" href="/issues/7" ' +
  'target="_blank" rel="noopener noreferrer" title="#7: a&lt;b&gt; &amp; &quot;c&quot;">#7</a>'
);

// A known-missing / forbidden id (cached as false) stays a bare "#id" tooltip.
assert.strictEqual(
  renderTopicHtml('#7', '/issues/', { '7': false }),
  '<a class="redmind-issue-link" data-issue-id="7" href="/issues/7" ' +
  'target="_blank" rel="noopener noreferrer" title="#7">#7</a>'
);

// Non-issue text is escaped, and "#" without digits is left alone.
assert.strictEqual(
  renderTopicHtml('a<b> & "c" #fff'),
  'a&lt;b&gt; &amp; &quot;c&quot; #fff'
);

// HTML injected around a reference cannot break out of the escaping.
assert.strictEqual(
  renderTopicHtml('<img src=x> #9'),
  '&lt;img src=x&gt; <a class="redmind-issue-link" data-issue-id="9" href="/issues/9" ' +
  'target="_blank" rel="noopener noreferrer" title="#9">#9</a>'
);

// A number without "#" is not linked.
assert.strictEqual(renderTopicHtml('version 1234'), 'version 1234');

console.log('issue_link.test.js: all assertions passed');
