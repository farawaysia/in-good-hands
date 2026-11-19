/*
 * A small runtime that runs In Good Hands' design files (.dc.html) as a plain web page.
 * It understands the same template language as the design canvas: {{holes}}, <sc-if>, <sc-for>,
 * <dc-import>, event attributes such as onClick="{{fn}}", and a `class Component extends DCLogic`
 * logic block with state, setState and the React-style lifecycle methods.
 * Re-rendering is done by building fresh DOM and morphing it into the page (morphdom), so focus,
 * scroll positions and typed text survive updates.
 */
(function () {
  'use strict';
  var morph = window.morphdom;
  var HOLE_ALL = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;
  var HOLE = /\{\{\s*([^{}]+?)\s*\}\}/g;
  var BOOL_ATTRS = { disabled: 1, checked: 1, hidden: 1, selected: 1, readonly: 1, multiple: 1, required: 1, open: 1, autofocus: 1 };
  var EVENT_ATTRS = {
    onclick: 'click', onchange: 'change', oninput: 'input', onkeydown: 'keydown', onkeyup: 'keyup',
    onpointerup: 'pointerup', onpointerdown: 'pointerdown', onscroll: 'scroll', onfocus: 'focusin',
    onblur: 'focusout', onsubmit: 'submit', onmouseenter: 'mouseenter', onmouseleave: 'mouseleave'
  };

  // ---------- template lookup
  function lookup(path, scopes) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (path === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var head = parts[0], v, found = false;
    for (var i = scopes.length - 1; i >= 0; i--) {
      var s = scopes[i];
      if (s != null && Object.prototype.hasOwnProperty.call(s, head)) { v = s[head]; found = true; break; }
    }
    if (!found) return undefined;
    for (var j = 1; j < parts.length; j++) {
      if (v == null) return undefined;
      v = v[parts[j]];
    }
    return v;
  }
  function str(v) { return v == null || v === false ? '' : String(v); }
  function interp(text, scopes) {
    return text.replace(HOLE, function (_, p) { return str(lookup(p, scopes)); });
  }

  // which DOM event a React-style onChange maps to, for this element
  function changeEvent(el) {
    var tag = el.localName;
    if (tag === 'textarea') return 'input';
    if (tag === 'input') {
      var t = (el.getAttribute('type') || 'text').toLowerCase();
      if (t === 'checkbox' || t === 'radio' || t === 'file') return 'change';
      return 'input';
    }
    return 'change';
  }

  // ---------- building DOM from a template node
  function Host(name, defs, props) {
    this.name = name;
    this.defs = defs;
    var Cls = defs[name].Component;
    this.inst = new Cls(props || {});
    this.inst.__host = this;
    if (!this.inst.state) this.inst.state = {};
    this.tpl = defs[name].template;
    this.mounted = false;
    this.pending = false;
    this.cbs = [];
    this.children = [];
  }
  Host.prototype.build = function (node, scopes, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      out.push(document.createTextNode(t.indexOf('{{') >= 0 ? interp(t, scopes) : t));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    var self = this;
    if (tag === 'sc-if') {
      if (lookup((node.getAttribute('value') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scopes)) {
        this.buildKids(node, scopes, out);
      }
      return;
    }
    if (tag === 'sc-for') {
      var list = lookup((node.getAttribute('list') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scopes);
      var as = node.getAttribute('as') || 'item';
      if (list && typeof list.length === 'number') {
        for (var i = 0; i < list.length; i++) {
          var sc = {}; sc[as] = list[i]; sc.$index = i;
          this.buildKids(node, scopes.concat([sc]), out);
        }
      }
      return;
    }
    if (tag === 'dc-import') {
      var ph = document.createElement('div');
      ph.setAttribute('data-dc-child', node.getAttribute('name'));
      ph.style.width = '100%';
      out.push(ph);
      return;
    }
    var el = node.namespaceURI && node.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(node.namespaceURI, node.localName)
      : document.createElement(node.localName);
    var h = null, boundValue, hasValue = false, boundChecked, hasChecked = false;
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var an = at.name, av = at.value;
      if (an.indexOf('hint-') === 0) continue;
      var whole = HOLE_ALL.exec(av);
      if (EVENT_ATTRS[an]) {
        var fn = whole ? lookup(whole[1], scopes) : null;
        if (typeof fn === 'function') {
          h = h || {};
          var ev = an === 'onchange' ? null : EVENT_ATTRS[an];
          h[ev || '__change'] = fn;
        }
        continue;
      }
      var val = whole ? lookup(whole[1], scopes) : (av.indexOf('{{') >= 0 ? interp(av, scopes) : av);
      if (an === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
        boundValue = val; hasValue = true;
        if (tag !== 'textarea') el.setAttribute('value', str(val));
        continue;
      }
      if (an === 'checked' && tag === 'input') { boundChecked = !!val && val !== 'false'; hasChecked = true; continue; }
      if (BOOL_ATTRS[an]) {
        if (whole ? (val && val !== 'false') : true) el.setAttribute(an, '');
        continue;
      }
      if (val == null || (val === false && an.indexOf('aria-') !== 0 && an.indexOf('data-') !== 0)) continue;
      try { el.setAttribute(an, typeof val === 'boolean' ? String(val) : String(val)); } catch (e) {}
    }
    if (h) {
      if (h.__change) { h[changeEvent(el)] = h.__change; delete h.__change; }
      el.__h = h;
    }
    var kids = [];
    // the children of <template> nodes live in .content; plain nodes keep them in childNodes
    this.buildKids(node, scopes, kids);
    for (var k = 0; k < kids.length; k++) el.appendChild(kids[k]);
    if (hasValue) {
      if (tag === 'select') {
        var opts = el.querySelectorAll('option');
        for (var o = 0; o < opts.length; o++) {
          if (opts[o].value === str(boundValue)) opts[o].setAttribute('selected', ''); else opts[o].removeAttribute('selected');
        }
      }
      try { el.value = str(boundValue); } catch (e) {}
    }
    if (hasChecked) { el.checked = boundChecked; if (boundChecked) el.setAttribute('checked', ''); }
    out.push(el);
  };
  Host.prototype.buildKids = function (node, scopes, out) {
    var c = node.childNodes;
    for (var i = 0; i < c.length; i++) this.build(c[i], scopes, out);
  };

  Host.prototype.schedule = function (cb) {
    if (cb) this.cbs.push(cb);
    if (this.pending || !this.mounted) return;
    this.pending = true;
    var self = this;
    Promise.resolve().then(function () { self.pending = false; self.render(); });
  };
  Host.prototype.mount = function (container) {
    this.container = container;
    this.render(true);
  };
  Host.prototype.render = function (first) {
    var inst = this.inst, vals;
    var prevState = this._prevState || inst.state;
    try { vals = inst.renderVals ? inst.renderVals() : {}; } catch (e) { console.error('[' + this.name + '] renderVals failed', e); return; }
    var scopes = [vals || {}];
    var nodes = [];
    this.buildKids(this.tpl, scopes, nodes);
    var next = document.createElement('div');
    for (var i = 0; i < nodes.length; i++) next.appendChild(nodes[i]);
    if (first) {
      while (next.firstChild) this.container.appendChild(next.firstChild);
    } else {
      morph(this.container, next, {
        childrenOnly: true,
        onBeforeElUpdated: function (fromEl, toEl) {
          if (fromEl.__dcHost) return false;
          fromEl.__h = toEl.__h;
          if (fromEl.localName === 'input' && fromEl.type === 'file') return false;
          return true;
        },
        onBeforeNodeDiscarded: function (node) {
          if (node.__dcHost && node.__dcHost.inst.componentWillUnmount) { try { node.__dcHost.inst.componentWillUnmount(); } catch (e) {} }
          return true;
        }
      });
    }
    // mount any child components whose placeholder is new
    var phs = this.container.querySelectorAll('[data-dc-child]');
    for (var p = 0; p < phs.length; p++) {
      var ph = phs[p];
      if (ph.__dcHost) continue;
      var name = ph.getAttribute('data-dc-child');
      if (!this.defs[name]) continue;
      var child = new Host(name, this.defs, {});
      ph.__dcHost = child;
      child.mount(ph);
      child.mounted = true;
      if (child.inst.componentDidMount) { try { child.inst.componentDidMount(); } catch (e) { console.error(e); } }
    }
    var wasMounted = this.mounted;
    this.mounted = true;
    this._prevState = inst.state;
    if (!first && wasMounted && inst.componentDidUpdate) { try { inst.componentDidUpdate({}, prevState); } catch (e) { console.error(e); } }
    var cbs = this.cbs; this.cbs = [];
    cbs.forEach(function (cb) { try { cb(); } catch (e) { console.error(e); } });
  };

  // ---------- the base class every Component extends
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u, cb) {
    var patch = typeof u === 'function' ? u(this.state, this.props) : u;
    if (patch != null) this.state = Object.assign({}, this.state, patch);
    if (this.__host) this.__host.schedule(cb);
  };
  DCLogic.prototype.forceUpdate = function (cb) { if (this.__host) this.__host.schedule(cb); };
  window.DCLogic = DCLogic;

  // ---------- one delegated listener per event type, calling React-style handlers bottom-up
  function dispatch(e) {
    var type = e.type, el = e.target, stopped = false;
    if (el && el.nodeType === 3) el = el.parentNode;
    var origStop = e.stopPropagation;
    while (el && el !== document) {
      var h = el.__h && el.__h[type];
      if (h) {
        var cur = el;
        var proxy = new Proxy(e, {
          get: function (t, prop) {
            if (prop === 'currentTarget') return cur;
            if (prop === 'stopPropagation') return function () { stopped = true; origStop.call(t); };
            if (prop === 'nativeEvent') return t;
            if (prop === 'persist') return function () {};
            var v = t[prop];
            return typeof v === 'function' ? v.bind(t) : v;
          }
        });
        try { h(proxy); } catch (err) { console.error(err); }
        if (stopped) return;
      }
      if (type === 'scroll' || type === 'mouseenter' || type === 'mouseleave') return;
      el = el.parentNode;
    }
  }
  ['click', 'input', 'change', 'keydown', 'keyup', 'pointerup', 'pointerdown', 'focusin', 'focusout', 'submit'].forEach(function (t) {
    document.addEventListener(t, dispatch);
  });
  document.addEventListener('scroll', dispatch, true);

  // ---------- boot: read the templates and logic from the page, then mount the entry component
  function boot() {
    var defs = {};
    document.querySelectorAll('template[data-dc]').forEach(function (t) {
      var name = t.getAttribute('data-dc');
      var logic = document.querySelector('script[type="text/x-dc-logic"][data-dc="' + name + '"]');
      var Component;
      try {
        Component = new Function('DCLogic', (logic ? logic.textContent : 'class Component extends DCLogic {}') + '\n;return Component;')(DCLogic);
      } catch (e) { console.error('[' + name + '] logic failed to load', e); Component = class extends DCLogic {}; }
      defs[name] = { template: t.content, Component: Component };
    });
    var root = document.getElementById('dc-root');
    var entry = root.getAttribute('data-entry');
    var host = new Host(entry, defs, {});
    root.__dcHost = host;
    host.mount(root);
    if (host.inst.componentDidMount) { try { host.inst.componentDidMount(); } catch (e) { console.error(e); } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
