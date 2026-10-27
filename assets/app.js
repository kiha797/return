/* 화면 템플릿 렌더러 (React 18) */
(function () {
  var R = window.React, h = R.createElement;

  var EVENTS = { onclick: 'onClick', onchange: 'onChange', onfocus: 'onFocus', onblur: 'onBlur', oninput: 'onInput', onmouseup: 'onMouseUp', onkeydown: 'onKeyDown' };
  var RENAME = { 'class': 'className', 'for': 'htmlFor', inputmode: 'inputMode', maxlength: 'maxLength', readonly: 'readOnly', tabindex: 'tabIndex', colspan: 'colSpan', rowspan: 'rowSpan', viewbox: 'viewBox', 'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'fill-rule': 'fillRule', autocomplete: 'autoComplete' };
  var BOOL = { disabled: 1, checked: 1, readonly: 1, selected: 1, multiple: 1, hidden: 1 };
  var SKIP = /^hint-/;

  function lookup(vals, scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    if (/^'.*'$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.'), v = Object.prototype.hasOwnProperty.call(scope, parts[0]) ? scope[parts[0]] : vals[parts[0]];
    for (var i = 1; i < parts.length; i++) v = v == null ? undefined : v[parts[i]];
    return v;
  }
  function interp(str, vals, scope) {
    var whole = str.match(/^\s*\{\{([^}]+)\}\}\s*$/);
    if (whole) return lookup(vals, scope, whole[1]);
    if (str.indexOf('{{') < 0) return str;
    return str.replace(/\{\{([^}]+)\}\}/g, function (_, p) { var v = lookup(vals, scope, p); return v == null ? '' : String(v); });
  }
  function styleObj(s) {
    var o = {};
    String(s).split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k) return;
      if (k.indexOf('--') !== 0) k = k.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      o[k] = v;
    });
    return o;
  }

  function kids(list, vals, scope, prefix) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var r = build(list[i], vals, scope, prefix + '.' + i);
      if (r === null || r === undefined || r === '') continue;
      out.push(r);
    }
    return out;
  }

  function build(node, vals, scope, key) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (!/\S/.test(t)) return t.indexOf('\n') >= 0 ? null : ' ';
      return interp(t, vals, scope);
    }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'template') {
      var kind = node.getAttribute('data-dc');
      var content = node.content.childNodes;
      if (kind === 'if') {
        return lookup(vals, scope, node.getAttribute('value').replace(/[{}]/g, '')) ? h(R.Fragment, { key: key }, kids(content, vals, scope, key)) : null;
      }
      if (kind === 'for') {
        var list = lookup(vals, scope, node.getAttribute('list').replace(/[{}]/g, '')) || [];
        var as = node.getAttribute('as') || 'item';
        return h(R.Fragment, { key: key }, list.map(function (it, i) {
          var sc = Object.assign({}, scope); sc[as] = it; sc.$index = i;
          return h(R.Fragment, { key: key + ':' + i }, kids(content, vals, sc, key + ':' + i));
        }));
      }
      return null;
    }
    var props = { key: key };
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a], name = at.name, raw = at.value;
      if (SKIP.test(name)) continue;
      var v = interp(raw, vals, scope);
      if (EVENTS[name]) { if (typeof v === 'function') props[EVENTS[name]] = v; continue; }
      if (name === 'style') { if (v) props.style = styleObj(v); continue; }
      if (BOOL[name]) {
        var b = raw.indexOf('{{') >= 0 ? !!v : true;
        props[RENAME[name] || name] = b; continue;
      }
      if (v === undefined || v === null) continue;
      props[RENAME[name] || name] = v;
    }
    if ((tag === 'input' || tag === 'select' || tag === 'textarea') && ('value' in props || 'checked' in props) && !props.onChange) props.readOnly = true;
    if (tag === 'select' && 'readOnly' in props) delete props.readOnly;
    if ('value' in props && props.value === undefined) props.value = '';
    var ch = kids(node.childNodes, vals, scope, key);
    var VOID = { input: 1, img: 1, br: 1, hr: 1, col: 1, meta: 1, link: 1 };
    return VOID[tag] ? h(tag, props) : h.apply(null, [tag, props].concat(ch));
  }

  function parseTemplate(src) {
    var s = src.replace(/<sc-(for|if)\b/g, '<template data-dc="$1"').replace(/<\/sc-(for|if)>/g, '</template>');
    var doc = new DOMParser().parseFromString('<!doctype html><html><body><div id="__r">' + s + '</div></body></html>', 'text/html');
    return doc.getElementById('__r').childNodes;
  }

  window.DCLogic = class DCLogic extends R.Component {
    renderVals() { return {}; }
    render() {
      var vals = this.renderVals() || {};
      return h(R.Fragment, null, kids(window.__dcTemplate, vals, {}, 'r'));
    }
  };

  window.dcMount = function (tplId, rootId, C) {
    window.__dcTemplate = parseTemplate(document.getElementById(tplId).textContent);
    window.ReactDOM.createRoot(document.getElementById(rootId)).render(h(C, {}));
  };
})();
