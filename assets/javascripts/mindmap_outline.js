(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RedmineRedmindOutline = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function repeat(str, n) {
    var out = '';
    for (var i = 0; i < n; i++) { out += str; }
    return out;
  }

  function oneLine(topic) {
    return String(topic == null ? '' : topic)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+$/, '');
  }

  function makeIdFactory(prefix) {
    var counter = 0;
    return function () {
      counter += 1;
      return prefix + '-' + counter;
    };
  }

  function leadingIndentWidth(lead, tabSize) {
    var indent = 0;
    for (var c = 0; c < lead.length; c++) {
      indent += (lead.charAt(c) === '\t') ? tabSize : 1;
    }
    return indent;
  }

  function parseOutline(text, opts) {
    opts = opts || {};
    var title = opts.title || 'Mind Map';
    var nextId = makeIdFactory(opts.idPrefix || 'me');
    var tabSize = opts.tabSize || 2;

    function newNode(topic) {
      return { id: nextId(), topic: oneLine(topic), children: [] };
    }

    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var roots = [];
    var stack = [];

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw || raw.trim() === '') { continue; }

      var lead = raw.match(/^[ \t]*/)[0];
      var indent = leadingIndentWidth(lead, tabSize);

      // Strip a single leading bullet marker: "- ", "* ", "+ ", or a bare "-".
      var content = raw.slice(lead.length).replace(/^[-*+](\s+|$)/, '');
      var topic = oneLine(content) || ' ';

      var node = newNode(topic);
      while (stack.length && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      if (stack.length === 0) {
        roots.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }
      stack.push({ indent: indent, node: node });
    }

    // A mind map has a single root. Several top-level lines are wrapped in a
    // synthetic root; serializeOutline() unwraps it to keep the round-trip lossless.
    var synthetic = false;
    var rootNode;
    if (roots.length === 1) {
      rootNode = roots[0];
    } else if (roots.length === 0) {
      rootNode = newNode(title);
    } else {
      rootNode = newNode(title);
      rootNode.children = roots;
      synthetic = true;
    }

    return { nodeData: rootNode, synthetic: synthetic };
  }

  function serializeOutline(nodeData, opts) {
    opts = opts || {};
    var synthetic = !!opts.synthetic;
    var indentUnit = opts.indentUnit || '  ';
    var out = [];

    function walk(node, depth) {
      if (!node) { return; }
      out.push(repeat(indentUnit, depth) + '- ' + oneLine(node.topic));
      var children = node.children || [];
      for (var i = 0; i < children.length; i++) {
        walk(children[i], depth + 1);
      }
    }

    if (synthetic) {
      var children = (nodeData && nodeData.children) || [];
      for (var i = 0; i < children.length; i++) {
        walk(children[i], 0);
      }
    } else {
      walk(nodeData, 0);
    }

    return out.join('\n');
  }

  return {
    parseOutline: parseOutline,
    serializeOutline: serializeOutline,
    oneLine: oneLine
  };
});
