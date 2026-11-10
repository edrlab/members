/* EDRLab members site interactions. No dependencies. */
(function () {
  'use strict';

  /* ---------- Logo strip (home) ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function initLogos() {
    var holder = document.getElementById('k-logos');
    var data = document.getElementById('k-logos-data');
    if (!holder || !data) return;
    var all;
    try { all = JSON.parse(data.textContent); } catch (e) { return; }
    var anchors = shuffle(all.filter(function (m) { return m.anchor; })).slice(0, 2);
    var rest = shuffle(all.filter(function (m) { return m.featured && !m.anchor; })).slice(0, 12);
    if (anchors.length < 2 || rest.length < 1) return;   // keep the build-time selection
    var picks = shuffle(anchors.map(function (m) { m.big = true; return m; }).concat(rest));
    holder.innerHTML = '';
    picks.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'k-logos__item' + (m.big ? ' k-logos__item--big' : '');
      var a = document.createElement('a');
      a.href = m.url; a.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;text-decoration:none';
      if (m.logo) {
        var img = document.createElement('img');
        img.src = m.logo; img.alt = m.name; img.loading = 'lazy';
        a.appendChild(img);
      } else {
        var s = document.createElement('span'); s.textContent = m.name; a.appendChild(s);
      }
      li.appendChild(a); holder.appendChild(li);
    });
  }

  /* ---------- Directory ---------- */
  function initDirectory() {
    var root = document.getElementById('k-directory');
    if (!root) return;
    var PAGE = 12;
    var items = Array.prototype.slice.call(root.querySelectorAll('#k-cards > li'));
    var q = root.querySelector('#k-q');
    var country = root.querySelector('#k-country');
    var groups = ['cat', 'ig', 'cr'];
    var counter = root.querySelector('#k-count');
    var activeBox = root.querySelector('#k-active');
    var pager = root.querySelector('#k-pager');
    var empty = root.querySelector('#k-empty');
    var state = { q: '', country: '', cat: [], ig: [], cr: [], page: 1 };

    items.forEach(function (li) {
      li._d = {
        text: (li.getAttribute('data-text') || '').toLowerCase(),
        country: li.getAttribute('data-country') || '',
        cat: split(li.getAttribute('data-cat')), ig: split(li.getAttribute('data-ig')), cr: split(li.getAttribute('data-cr'))
      };
    });
    function split(s) { return s ? s.split('|').filter(Boolean) : []; }

    function readUrl() {
      var p = new URLSearchParams(location.search);
      state.q = p.get('q') || '';
      state.country = p.get('country') || '';
      groups.forEach(function (g) { state[g] = split(p.get(g) || '').length ? (p.get(g) || '').split('|') : []; });
      state.page = parseInt(p.get('page') || '1', 10) || 1;
    }
    function writeUrl() {
      var p = new URLSearchParams();
      var query = state.q.trim();
      if (query) p.set('q', query);
      if (state.country) p.set('country', state.country);
      groups.forEach(function (g) { if (state[g].length) p.set(g, state[g].join('|')); });
      if (state.page > 1) p.set('page', state.page);
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
    function matches(d, skip) {
      var query = state.q.trim().toLowerCase();
      if (skip !== 'q' && query && d.text.indexOf(query) === -1) return false;
      if (skip !== 'country' && state.country && d.country !== state.country) return false;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g === skip || !state[g].length) continue;
        if (!state[g].some(function (v) { return d[g].indexOf(v) !== -1; })) return false;
      }
      return true;
    }
    function syncControls() {
      q.value = state.q; country.value = state.country;
      groups.forEach(function (g) {
        root.querySelectorAll('input[data-g="' + g + '"]').forEach(function (cb) { cb.checked = state[g].indexOf(cb.value) !== -1; });
      });
    }
    function updateCounts() {
      groups.forEach(function (g) {
        root.querySelectorAll('input[data-g="' + g + '"]').forEach(function (cb) {
          var n = 0;
          items.forEach(function (li) { if (matches(li._d, g) && li._d[g].indexOf(cb.value) !== -1) n++; });
          cb.parentNode.querySelector('em').textContent = n;
        });
      });
      Array.prototype.forEach.call(country.options, function (o) {
        if (!o.value) return;
        var n = 0;
        items.forEach(function (li) { if (matches(li._d, 'country') && li._d.country === o.value) n++; });
        o.textContent = o.value + ' (' + n + ')';
      });
    }
    function chips() {
      activeBox.innerHTML = '';
      function add(label, fn) {
        var b = document.createElement('button'); b.type = 'button';
        b.textContent = label + ' ×'; b.setAttribute('aria-label', 'Remove filter ' + label);
        b.addEventListener('click', function () { fn(); state.page = 1; render(true); });
        activeBox.appendChild(b);
      }
      if (state.q.trim()) add('"' + state.q.trim() + '"', function () { state.q = ''; });
      if (state.country) add(state.country, function () { state.country = ''; });
      groups.forEach(function (g) {
        state[g].forEach(function (v) { var cb = root.querySelector('input[data-g="' + g + '"][value="' + v.replace(/"/g, '\\"') + '"]'); var lab = cb ? cb.parentNode.querySelector('span').textContent : v; add(lab, function () { state[g] = state[g].filter(function (x) { return x !== v; }); }); });
      });
      activeBox.hidden = !activeBox.children.length;
    }
    function pageButtons(total) {
      var pages = Math.max(1, Math.ceil(total / PAGE));
      var ol = pager.querySelector('ol'); ol.innerHTML = '';
      function btn(label, page, opts) {
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.textContent = label;
        if (opts && opts.cls) b.className = opts.cls;
        if (opts && opts.aria) b.setAttribute('aria-label', opts.aria);
        if (page === state.page && !(opts && opts.cls)) b.setAttribute('aria-current', 'page');
        if (opts && opts.disabled) b.disabled = true;
        b.addEventListener('click', function () { state.page = page; render(false, true); });
        li.appendChild(b); ol.appendChild(li);
      }
      btn('‹', state.page - 1, { cls: 'k-arrow', aria: 'Previous page', disabled: state.page <= 1 });
      var shown = [];
      for (var p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - state.page) <= 1) shown.push(p);
      var last = 0;
      shown.forEach(function (p) {
        if (p - last > 1) { var li = document.createElement('li'); li.textContent = '…'; ol.appendChild(li); }
        btn(String(p), p); last = p;
      });
      btn('›', state.page + 1, { cls: 'k-arrow', aria: 'Next page', disabled: state.page >= pages });
      pager.hidden = pages <= 1;
    }
    function render(resetUrl, scroll) {
      var hits = items.filter(function (li) { return matches(li._d); });
      var pages = Math.max(1, Math.ceil(hits.length / PAGE));
      if (state.page > pages) state.page = pages;
      var from = (state.page - 1) * PAGE, to = from + PAGE;
      items.forEach(function (li) { li.hidden = true; });
      hits.slice(from, to).forEach(function (li) { li.hidden = false; });
      counter.textContent = hits.length + (hits.length === 1 ? ' member' : ' members');
      pager.querySelector('.k-showing').textContent = hits.length ? 'Showing ' + (from + 1) + '–' + Math.min(to, hits.length) + ' of ' + hits.length : '';
      empty.hidden = hits.length > 0;
      syncControls(); updateCounts(); chips(); pageButtons(hits.length); writeUrl();
      if (scroll) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    q.addEventListener('input', function () { state.q = q.value; state.page = 1; render(); });
    country.addEventListener('change', function () { state.country = country.value; state.page = 1; render(); });
    root.querySelectorAll('input[data-g]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var g = cb.getAttribute('data-g'), i = state[g].indexOf(cb.value);
        if (cb.checked && i === -1) state[g].push(cb.value);
        if (!cb.checked && i !== -1) state[g].splice(i, 1);
        state.page = 1; render();
      });
    });
    root.querySelectorAll('[data-more]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = root.querySelector('#' + btn.getAttribute('data-more')), open = btn.getAttribute('aria-expanded') === 'true';
        box.querySelectorAll('.k-opt[data-extra]').forEach(function (o) { o.hidden = open; });
        btn.setAttribute('aria-expanded', String(!open));
        btn.textContent = open ? btn.getAttribute('data-label-more') : 'Show fewer';
      });
    });
    var fb = root.querySelector('.k-filterbtn');
    if (fb) fb.addEventListener('click', function () {
      var f = root.querySelector('.k-filters'), o = f.classList.toggle('is-open'); fb.setAttribute('aria-expanded', o);
    });
    var form = root.querySelector('form'); if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

    readUrl();
    // open the "show all" lists when a hidden option is already selected in the URL
    root.querySelectorAll('[data-more]').forEach(function (btn) {
      var g = btn.getAttribute('data-group');
      var needs = state[g].some(function (v) { var cb = root.querySelector('input[data-g="' + g + '"][value="' + v.replace(/"/g, '\\"') + '"]'); return cb && cb.closest('.k-opt[data-extra]'); });
      if (needs) btn.click();
    });
    root.classList.add('is-js');
    render();
  }

  function initJoinForm() {
    var form = document.getElementById('k-join-form');
    if (!form) return;

    var consent = form.querySelector('#k-consent');
    var submit = form.querySelector('#k-submit');
    var size = form.querySelector('#k-size');
    var fee = form.querySelector('#k-size-fee');
    var success = document.getElementById('k-join-confirm');
    var required = Array.prototype.slice.call(form.querySelectorAll('[data-required]'));

    function setFee() {
      if (!size || !fee) return;
      var opt = size.options[size.selectedIndex];
      var amount = opt ? opt.getAttribute('data-fee') : '';
      if (amount) {
        fee.textContent = 'Annual dues for this category: ' + amount + ' € per year';
        fee.hidden = false;
      } else {
        fee.textContent = '';
        fee.hidden = true;
      }
    }

    function setConsentState() {
      if (!submit || !consent) return;
      submit.disabled = !consent.checked;
    }

    function errorNode(el) {
      return form.querySelector('#' + el.id + '-err');
    }

    function clearError(el) {
      var node = errorNode(el);
      if (node) node.textContent = '';
      el.removeAttribute('aria-invalid');
    }

    function validate(el) {
      clearError(el);
      var node = errorNode(el);
      var ok = true;
      var msg = '';
      if (el.type === 'checkbox') {
        ok = el.checked;
        if (!ok) msg = 'Please check this box.';
      } else {
        ok = !!el.value.trim();
        if (!ok) msg = 'This field is required.';
        if (ok && el.type === 'email') {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
          if (!ok) msg = 'Please enter a valid email address.';
        }
        if (ok && el.type === 'url') {
          try { new URL(el.value.trim()); } catch (_) { ok = false; msg = 'Please enter a valid URL.'; }
        }
      }
      if (!ok) {
        el.setAttribute('aria-invalid', 'true');
        if (node) node.textContent = msg;
      }
      return ok;
    }

    required.forEach(function (el) {
      var eventName = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, function () { validate(el); });
    });
    if (size) size.addEventListener('change', setFee);
    if (consent) consent.addEventListener('change', setConsentState);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      required.forEach(function (el) {
        if (!validate(el) && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      form.hidden = true;
      if (success) success.hidden = false;
    });

    setFee();
    setConsentState();
  }

  function ready(fn) { document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(function () { initLogos(); initDirectory(); initJoinForm(); });
})();
