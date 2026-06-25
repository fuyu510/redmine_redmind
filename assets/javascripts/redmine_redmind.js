(function () {
  'use strict';

  var DEFAULT_HEIGHT = 460;

  function ignore(_e) {
    return undefined;
  }

  function config() {
    return window.RedmineRedmindConfig || { saveUrl: '/mindmaps/save', i18n: {} };
  }

  function t(key, fallback) {
    var i18n = config().i18n || {};
    return i18n[key] || fallback;
  }

  function constructor() {
    var ns = window.MindElixir;
    if (!ns) { return null; }
    return ns.default || ns;
  }

  function assign(target, source) {
    for (var k in source) {
      if (Object.prototype.hasOwnProperty.call(source, k)) { target[k] = source[k]; }
    }
    return target;
  }

  var PALETTE = ['#dd7878', '#ea76cb', '#8839ef', '#e64553', '#fe640b', '#df8e1d', '#40a02b', '#209fb5', '#1e66f5', '#7287fd'];
  var THEME_KEY = 'redmineRedmindTheme';

  function geometryVars() {
    return {
      '--node-gap-x': '30px', '--node-gap-y': '10px', '--main-gap-x': '65px', '--main-gap-y': '45px',
      '--root-radius': '30px', '--main-radius': '20px', '--root-border-color': 'rgba(0,0,0,0)',
      '--main-border': '', '--topic-padding': '3px', '--selected': '#4dc4ff',
      '--accent-color': '#e64553', '--map-padding': '50px 80px'
    };
  }

  function lightTheme() {
    return { name: 'RedmindLight', type: 'light', palette: PALETTE, cssVar: assign(geometryVars(), {
      '--root-color': '#ffffff', '--root-bgcolor': '#2f3b52',
      '--main-color': '#1f2328', '--main-bgcolor': '#ffffff', '--main-bgcolor-transparent': 'rgba(255,255,255,0.85)',
      '--color': '#1f2328', '--bgcolor': '#ffffff',
      '--panel-color': '#1f2328', '--panel-bgcolor': '#ffffff', '--panel-border-color': '#e2e2e2'
    }) };
  }

  function darkTheme() {
    return { name: 'RedmindDark', type: 'dark', palette: PALETTE, cssVar: assign(geometryVars(), {
      '--root-color': '#ffffff', '--root-bgcolor': '#3a4663',
      '--main-color': '#ffffff', '--main-bgcolor': '#3b3b3b', '--main-bgcolor-transparent': 'rgba(40,40,40,0.85)',
      '--color': '#e8e8e8', '--bgcolor': '#1f1f1f',
      '--panel-color': '#ffffff', '--panel-bgcolor': '#2d3748', '--panel-border-color': '#3a4252'
    }) };
  }

  function savedThemeName() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }

  function persistThemeName(name) {
    try { localStorage.setItem(THEME_KEY, name); } catch (e) { ignore(e); }
  }

  function themeObject(name) {
    return name === 'dark' ? darkTheme() : lightTheme();
  }

  function fitView(mind, container) {
    if (!mind) { return; }
    var run = function () {
      try { mind.toCenter(); mind.scaleFit(); } catch (e) { ignore(e); }
    };
    run();
    window.setTimeout(run, 60);
    window.setTimeout(run, 200);
    // The wiki column may finish laying out after init; re-fit on resize so the
    // map is never stuck at a scale computed from a zero/narrow container.
    if (container && window.ResizeObserver) {
      var count = 0;
      var ro = new window.ResizeObserver(function () {
        run();
        count += 1;
        if (count > 8) { try { ro.disconnect(); } catch (e) { ignore(e); } }
      });
      try { ro.observe(container); } catch (e) { ignore(e); }
      window.setTimeout(function () { try { ro.disconnect(); } catch (e) { ignore(e); } }, 2500);
    }
  }

  function zoomOnWheel(e, mind) {
    if (!mind) { return; }
    if (e && e.preventDefault) { e.preventDefault(); }
    var step = mind.scaleSensitivity || 0.1;
    var dir = (e && e.deltaY < 0) ? 1 : -1;
    var min = mind.scaleMin || 0.05;
    var max = mind.scaleMax || 3;
    var next = (mind.scaleVal || 1) + dir * step;
    next = Math.max(min, Math.min(max, next));
    mind.scale(next);
  }

  function enableDragPan(mind, container) {
    if (!mind || !container) { return; }
    var surface = container.querySelector('.map-container') || container;
    var panning = false;
    var lastX = 0;
    var lastY = 0;
    var nodeSelector = 'me-tpc, me-parent, me-root, me-epd, .mind-elixir-toolbar, .context-menu, .svg-label, #input-box, .circle';

    function onBackground(target) {
      return !(target && target.closest && target.closest(nodeSelector));
    }

    surface.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || mind.spacePressed || !onBackground(e.target)) { return; }
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      try { surface.setPointerCapture(e.pointerId); } catch (err) { ignore(err); }
    });

    surface.addEventListener('pointermove', function (e) {
      if (!panning) { return; }
      try { mind.move(e.clientX - lastX, e.clientY - lastY); } catch (err) { ignore(err); }
      lastX = e.clientX;
      lastY = e.clientY;
    });

    function stop() { panning = false; }
    surface.addEventListener('pointerup', stop);
    surface.addEventListener('pointercancel', stop);
  }

  // atob yields a byte string; rebuild the UTF-8 sequence so non-ASCII
  // (e.g. Korean) survives the round trip through data attributes.
  function decodeUnicode(b64) {
    return decodeURIComponent(Array.prototype.map.call(atob(b64), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  function encodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    }));
  }

  function directionValue(name) {
    var ns = window.MindElixir || {};
    switch (String(name || '').toLowerCase()) {
      case 'left': return ns.LEFT != null ? ns.LEFT : 0;
      case 'right': return ns.RIGHT != null ? ns.RIGHT : 1;
      default: return ns.SIDE != null ? ns.SIDE : 2;
    }
  }

  function csrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function showFallback(container, outline) {
    var pre = document.createElement('pre');
    pre.className = 'mindmap-fallback';
    pre.textContent = outline;
    container.innerHTML = '';
    container.appendChild(pre);
  }

  function buildReadonly(container, outline, options) {
    var Ctor = constructor();
    if (!Ctor || !window.RedmineRedmindOutline) {
      if (window.console && window.console.warn) {
        window.console.warn('[redmine_redmind] assets not loaded:', {
          MindElixir: typeof window.MindElixir,
          RedmineRedmindOutline: typeof window.RedmineRedmindOutline
        });
      }
      showFallback(container, outline);
      return null;
    }
    var parsed = window.RedmineRedmindOutline.parseOutline(outline, { title: options.title });
    var instance = null;
    var mind = new Ctor({
      el: container,
      direction: directionValue(options.direction),
      editable: false,
      contextMenu: false,
      toolBar: !!options.toolBar,
      keypress: false,
      draggable: false,
      mouseSelectionButton: 2,
      theme: themeObject(savedThemeName()),
      scaleSensitivity: 0.2,
      scaleMin: 0.05,
      scaleMax: 3,
      handleWheel: function (e) { zoomOnWheel(e, instance); }
    });
    instance = mind;
    mind.init({ nodeData: parsed.nodeData });
    if (typeof mind.disableEdit === 'function') { mind.disableEdit(); }
    fitView(mind, container);
    return mind;
  }

  function destroyMind(mind, container) {
    try {
      if (mind && typeof mind.destroy === 'function') { mind.destroy(); }
    } catch (e) { ignore(e); }
    if (container) { container.innerHTML = ''; }
  }

  function renderWrapper(wrapper) {
    if (wrapper.getAttribute('data-mindmap-init') === '1') { return; }
    wrapper.setAttribute('data-mindmap-init', '1');

    var diagram = wrapper.querySelector('.mindmap-diagram');
    if (!diagram) { return; }

    var state = readState(wrapper);
    diagram.style.height = state.height + 'px';

    if (savedThemeName() === 'dark') { wrapper.classList.add('mindmap-dark'); }
    wrapper._mindmap = buildReadonly(diagram, state.outline, state);
    addCornerButtons(wrapper, state);
  }

  function readState(wrapper) {
    var d = wrapper.dataset;
    var heightAttr = parseInt(d.mindmapHeight, 10);
    return {
      outlineB64: d.mindmapOutline || '',
      outline: d.mindmapOutline ? decodeUnicode(d.mindmapOutline) : '',
      title: d.mindmapTitle ? decodeUnicode(d.mindmapTitle) : '',
      editable: d.mindmapEditable === 'true',
      objectType: d.mindmapObjectType || '',
      objectId: d.mindmapObjectId || '',
      version: d.mindmapVersion || '',
      direction: d.mindmapDirection || '',
      height: heightAttr > 0 ? heightAttr : DEFAULT_HEIGHT,
      occurrence: occurrenceOf(wrapper)
    };
  }

  var occurrenceCounters = {};

  function occurrenceOf(wrapper) {
    var d = wrapper.dataset;
    var key = (d.mindmapObjectType || '') + '|' + (d.mindmapObjectId || '') + '|' + (d.mindmapOutline || '');
    var current = occurrenceCounters[key] || 0;
    occurrenceCounters[key] = current + 1;
    return current;
  }

  function editIcon() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 ' +
      '7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
  }

  function moonIcon() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M12.74 2.02A9 9 0 1 0 22 11.26a7 7 0 0 1-9.26-9.24z"/></svg>';
  }

  function sunIcon() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-6l2 3h-4l2-3zm0 ' +
      '22l-2-3h4l-2 3zM1 12l3-2v4l-3-2zm22 0l-3 2v-4l3 2zM4.2 4.2l3.3 1-2.3 2.3-1-3.3zm15.6 ' +
      '15.6l-3.3-1 2.3-2.3 1 3.3zM19.8 4.2l-1 3.3-2.3-2.3 3.3-1zM4.2 19.8l1-3.3 2.3 2.3-3.3 1z"/></svg>';
  }

  function fullscreenIcon() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path fill="currentColor" d="M4 9V4h5v2H6v3H4zm12-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 0h2v5h-5v-2h3v-3z"/></svg>';
  }

  function addCornerButtons(wrapper, state) {
    var corner = document.createElement('div');
    corner.className = 'mindmap-corner';

    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'mindmap-corner-btn mindmap-fullscreen-btn';
    fsBtn.title = t('fullscreen', 'Fullscreen');
    fsBtn.setAttribute('aria-label', fsBtn.title);
    fsBtn.innerHTML = fullscreenIcon();
    fsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openFullscreen(wrapper, state);
    });
    corner.appendChild(fsBtn);

    if (state.editable) {
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'mindmap-corner-btn mindmap-edit-btn';
      editBtn.title = t('edit', 'Edit');
      editBtn.setAttribute('aria-label', editBtn.title);
      editBtn.innerHTML = editIcon();
      editBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openEditor(wrapper, state);
      });
      corner.appendChild(editBtn);
    }

    wrapper.appendChild(corner);
  }

  function openFullscreen(wrapper, state) {
    if (!constructor() || !window.RedmineRedmindOutline) { return; }

    var overlay = document.createElement('div');
    overlay.className = 'mindmap-overlay';
    overlay.innerHTML =
      '<div class="mindmap-overlay-dialog mindmap-fs">' +
      '  <div class="mindmap-overlay-header">' +
      '    <span class="mindmap-overlay-title"></span>' +
      '    <span class="mindmap-overlay-actions">' +
      '      <button type="button" class="mindmap-btn mindmap-btn-theme"></button>' +
      '      <button type="button" class="mindmap-btn mindmap-btn-close"></button>' +
      '    </span>' +
      '  </div>' +
      '  <div class="mindmap-editor-canvas"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('mindmap-overlay-open');

    overlay.querySelector('.mindmap-overlay-title').textContent = state.title || t('view', 'Mind Map');
    var closeBtn = overlay.querySelector('.mindmap-btn-close');
    var themeBtn = overlay.querySelector('.mindmap-btn-theme');
    closeBtn.textContent = t('close', 'Close');

    var canvas = overlay.querySelector('.mindmap-editor-canvas');
    var mind = buildReadonly(canvas, state.outline, { direction: state.direction, title: state.title, toolBar: true });

    var currentTheme = savedThemeName();
    function updateThemeChrome(name) {
      overlay.classList.toggle('mindmap-dark', name === 'dark');
      themeBtn.innerHTML = name === 'dark' ? sunIcon() : moonIcon();
      themeBtn.title = name === 'dark' ? t('lightMode', 'Light mode') : t('darkMode', 'Dark mode');
      themeBtn.setAttribute('aria-label', themeBtn.title);
    }
    updateThemeChrome(currentTheme);

    themeBtn.addEventListener('click', function () {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      try { if (mind) { mind.changeTheme(themeObject(currentTheme), true); } } catch (e) { ignore(e); }
      persistThemeName(currentTheme);
      updateThemeChrome(currentTheme);
      fitView(mind, canvas);
    });

    function close() {
      document.removeEventListener('keydown', onKey);
      try { if (document.fullscreenElement) { document.exitFullscreen(); } } catch (e) { ignore(e); }
      destroyMind(mind, canvas);
      document.body.classList.remove('mindmap-overlay-open');
      if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    }

    function onKey(e) {
      if (e.key === 'Escape') { close(); }
    }
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', close);

    try {
      if (overlay.requestFullscreen) { overlay.requestFullscreen().catch(function () { ignore(); }); }
    } catch (e) { ignore(e); }
  }

  function openEditor(wrapper, state) {
    var Ctor = constructor();
    if (!Ctor || !window.RedmineRedmindOutline) { return; }

    var overlay = document.createElement('div');
    overlay.className = 'mindmap-overlay';
    overlay.innerHTML =
      '<div class="mindmap-overlay-dialog">' +
      '  <div class="mindmap-overlay-header">' +
      '    <span class="mindmap-overlay-title"></span>' +
      '    <span class="mindmap-overlay-actions">' +
      '      <button type="button" class="mindmap-btn mindmap-btn-theme"></button>' +
      '      <button type="button" class="mindmap-btn mindmap-btn-cancel"></button>' +
      '      <button type="button" class="mindmap-btn mindmap-btn-save"></button>' +
      '    </span>' +
      '  </div>' +
      '  <div class="mindmap-editor-canvas"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('mindmap-overlay-open');

    overlay.querySelector('.mindmap-overlay-title').textContent = t('editTitle', 'Mindmap editor');
    var cancelBtn = overlay.querySelector('.mindmap-btn-cancel');
    var saveBtn = overlay.querySelector('.mindmap-btn-save');
    cancelBtn.textContent = t('cancel', 'Cancel');
    saveBtn.textContent = t('save', 'Save');

    var canvas = overlay.querySelector('.mindmap-editor-canvas');
    var themeBtn = overlay.querySelector('.mindmap-btn-theme');
    var parsed = window.RedmineRedmindOutline.parseOutline(state.outline, { title: state.title });
    var synthetic = parsed.synthetic;
    var currentTheme = savedThemeName();

    var instance = null;
    var mind = new Ctor({
      el: canvas,
      direction: directionValue(state.direction),
      editable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
      allowUndo: true,
      mouseSelectionButton: 2,
      theme: themeObject(currentTheme),
      scaleSensitivity: 0.2,
      scaleMin: 0.05,
      scaleMax: 3,
      handleWheel: function (e) { zoomOnWheel(e, instance); }
    });
    instance = mind;
    mind.init({ nodeData: parsed.nodeData });
    fitView(mind, canvas);
    enableDragPan(mind, canvas);

    function updateThemeChrome(name) {
      overlay.classList.toggle('mindmap-dark', name === 'dark');
      themeBtn.innerHTML = name === 'dark' ? sunIcon() : moonIcon();
      themeBtn.title = name === 'dark' ? t('lightMode', 'Light mode') : t('darkMode', 'Dark mode');
      themeBtn.setAttribute('aria-label', themeBtn.title);
    }
    updateThemeChrome(currentTheme);

    themeBtn.addEventListener('click', function () {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      try { mind.changeTheme(themeObject(currentTheme), true); } catch (e) { ignore(e); }
      persistThemeName(currentTheme);
      updateThemeChrome(currentTheme);
      fitView(mind);
    });

    function close() {
      destroyMind(mind, canvas);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('mindmap-overlay-open');
      if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    }

    function onKey(e) {
      if (e.key === 'Escape') { close(); }
    }
    document.addEventListener('keydown', onKey);
    cancelBtn.addEventListener('click', close);

    saveBtn.addEventListener('click', function () {
      var data = mind.getData();
      var newOutline = window.RedmineRedmindOutline.serializeOutline(data.nodeData, { synthetic: synthetic });
      saveBtn.disabled = true;
      persist(wrapper, state, newOutline).then(function (ok) {
        saveBtn.disabled = false;
        if (ok) { close(); }
      });
    });
  }

  function persist(wrapper, state, newOutline) {
    var cfg = config();
    return fetch(cfg.saveUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        object_type: state.objectType,
        object_id: state.objectId,
        version: state.version,
        occurrence: state.occurrence,
        original: state.outlineB64,
        outline: newOutline
      })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.ok && body.status === 'ok') {
          applySaved(wrapper, state, body.outline || newOutline);
          notify(t('saved', 'Mindmap saved'), 'ok');
          return true;
        }
        var msg = body.message ||
          (res.status === 409 ? t('conflict', 'Content changed. Please reload.') : t('failed', 'Failed to save the mindmap.'));
        notify(msg, 'error');
        return false;
      });
    }).catch(function () {
      notify(t('failed', 'Failed to save the mindmap.'), 'error');
      return false;
    });
  }

  function applySaved(wrapper, state, outline) {
    state.outline = outline;
    state.outlineB64 = encodeUnicode(outline);
    wrapper.dataset.mindmapOutline = state.outlineB64;
    var diagram = wrapper.querySelector('.mindmap-diagram');
    destroyMind(wrapper._mindmap, diagram);
    wrapper._mindmap = buildReadonly(diagram, outline, state);
  }

  function notify(message, kind) {
    var toast = document.createElement('div');
    toast.className = 'mindmap-toast mindmap-toast-' + (kind || 'ok');
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(function () { toast.classList.add('mindmap-toast-visible'); }, 10);
    window.setTimeout(function () {
      toast.classList.remove('mindmap-toast-visible');
      window.setTimeout(function () {
        if (toast.parentNode) { toast.parentNode.removeChild(toast); }
      }, 300);
    }, 3000);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var wrappers = scope.querySelectorAll('.mindmap-wrapper');
    for (var i = 0; i < wrappers.length; i++) {
      renderWrapper(wrappers[i]);
    }
  }

  function init() {
    occurrenceCounters = {};
    scan(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (window.jQuery) {
    window.jQuery(document).ajaxComplete(function () { scan(document); });
  }

  window.RedmineRedmind = { init: init, scan: scan };
})();
