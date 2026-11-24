(function () {
  'use strict';

  var API = ''; // same-origin: /api/...
  var state = { products: [], categories: [], filter: '', search: '', editing: null, pendingImages: [] };

  var app = document.getElementById('app');

  var searchInput = document.getElementById('search-input');
  var categoryFilter = document.getElementById('category-filter');
  var addProductBtn = document.getElementById('add-product-btn');
  var manageCategoriesBtn = document.getElementById('manage-categories-btn');
  var categoriesOverlay = document.getElementById('categories-overlay');
  var categoriesClose = document.getElementById('categories-close');
  var categoriesDoneBtn = document.getElementById('categories-done-btn');
  var categoriesList = document.getElementById('categories-list');
  var categoriesError = document.getElementById('categories-error');
  var newCategoryInput = document.getElementById('new-category-input');
  var addCategoryBtn = document.getElementById('add-category-btn');
  var viewVisitorsBtn = document.getElementById('view-visitors-btn');
  var visitorsOverlay = document.getElementById('visitors-overlay');
  var visitorsClose = document.getElementById('visitors-close');
  var visitorsDoneBtn = document.getElementById('visitors-done-btn');
  var visitorsList = document.getElementById('visitors-list');
  var visitorsEmpty = document.getElementById('visitors-empty');
  var visitorsCount = document.getElementById('visitors-count');
  var reorderBtn = document.getElementById('reorder-btn');
  var noelBtn = document.getElementById('noel-btn');
  var downloadPdfBtn = document.getElementById('download-pdf-btn');
  var reorderOverlay = document.getElementById('reorder-overlay');
  var reorderClose = document.getElementById('reorder-close');
  var reorderCancelBtn = document.getElementById('reorder-cancel-btn');
  var reorderSaveBtn = document.getElementById('reorder-save-btn');
  var reorderCategorySelect = document.getElementById('reorder-category');
  var reorderList = document.getElementById('reorder-list');
  var resultCount = document.getElementById('result-count');
  var grid = document.getElementById('product-grid');
  var emptyState = document.getElementById('empty-state');
  var loadingState = document.getElementById('loading-state');

  var overlay = document.getElementById('editor-overlay');
  var editorTitle = document.getElementById('editor-title');
  var editorClose = document.getElementById('editor-close');
  var cancelBtn = document.getElementById('cancel-btn');
  var saveBtn = document.getElementById('save-btn');
  var deleteBtn = document.getElementById('delete-btn');
  var saveError = document.getElementById('save-error');
  var imageList = document.getElementById('image-list');
  var imageInput = document.getElementById('image-input');
  var imageStatus = document.getElementById('image-status');
  var fName = document.getElementById('f-name');
  var fCategory = document.getElementById('f-category');
  var fDescription = document.getElementById('f-description');
  var fVariants = document.getElementById('f-variants');
  var fPrice = document.getElementById('f-price');

  function toast(msg, isError) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (isError ? ' error' : '');
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function api(path, options, attempt) {
    options = options || {};
    attempt = attempt || 0;
    var safeToRetry = (options.method || 'GET').toUpperCase() !== 'POST';
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    options.credentials = 'same-origin';
    return fetch(API + path, options).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (e) { data = null; }
        if (!res.ok || data === null) {
          var err = new Error((data && data.error) || ('Server error (' + res.status + ')'));
          err.retry = res.status >= 500 || res.status === 429 || data === null;
          throw err;
        }
        return data;
      });
    }).catch(function (e) {
      var transient = e.retry !== false;
      if (safeToRetry && transient && attempt < 3) {
        return new Promise(function (r) { setTimeout(r, 600 * (attempt + 1)); })
          .then(function () { return api(path, options, attempt + 1); });
      }
      throw e;
    });
  }

  // ---------- Boot / data load ----------
  function boot() {
    Promise.all([api('/api/categories'), api('/api/products')]).then(function (res) {
      state.categories = res[0];
      state.products = res[1];
      fillCategorySelects();
      loadingState.hidden = true;
      render();
    }).catch(function (e) {
      loadingState.textContent = 'Could not load products. Pull to refresh.';
      toast(e.message, true);
    });
  }

  function fillCategorySelects() {
    var opts = state.categories.map(function (c) { return '<option value="' + c.slug + '">' + c.label + '</option>'; }).join('');
    categoryFilter.innerHTML = '<option value="">All categories</option>' + opts;
    fCategory.innerHTML = opts;
  }

  function refreshProducts() {
    return api('/api/products').then(function (list) { state.products = list; render(); });
  }

  // ---------- Render list ----------
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  function getFiltered() {
    var q = state.search.trim().toLowerCase();
    return state.products.filter(function (p) {
      if (state.filter && p.category !== state.filter) return false;
      if (q && p.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function render() {
    var list = getFiltered();
    resultCount.textContent = list.length + ' product' + (list.length === 1 ? '' : 's');
    emptyState.hidden = list.length !== 0;
    grid.innerHTML = list.map(function (p) {
      var img = p.images && p.images[0];
      var media = img
        ? '<img src="' + img.url + '" alt="" loading="lazy">'
        : '<span class="ph">No photo</span>';
      var countBadge = p.images && p.images.length > 1 ? ('<div class="p-card-imgcount">' + p.images.length + ' photos</div>') : '';
      return (
        '<div class="p-card" data-id="' + esc(p.id) + '">' +
          '<div class="p-card-main">' +
            '<div class="p-card-media">' + media + '</div>' +
            '<div class="p-card-body">' +
              '<div class="p-card-cat">' + esc(p.categoryLabel) + '</div>' +
              '<div class="p-card-name">' + esc(p.name) + '</div>' +
              countBadge +
            '</div>' +
          '</div>' +
          '<div class="p-card-actions">' +
            '<button type="button" class="p-edit">Edit</button>' +
            '<button type="button" class="p-del">Delete</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.p-card');
    if (!card) return;
    var p = state.products.find(function (x) { return x.id === card.dataset.id; });
    if (!p) return;
    if (e.target.closest('.p-del')) {
      if (!confirm('Delete "' + p.name + '"? This cannot be undone.')) return;
      api('/api/products/' + p.id, { method: 'DELETE' }).then(function () {
        toast('Deleted.');
        return refreshProducts();
      }).catch(function (err) { toast('Delete failed: ' + err.message, true); });
      return;
    }
    openEditor(p);
  });

  searchInput.addEventListener('input', function () { state.search = searchInput.value; render(); });
  categoryFilter.addEventListener('change', function () { state.filter = categoryFilter.value; render(); });

  // ---------- Categories ----------
  function categoryCounts() {
    var counts = {};
    state.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }

  function renderCategoriesList() {
    var counts = categoryCounts();
    categoriesList.innerHTML = state.categories.map(function (c) {
      var n = counts[c.slug] || 0;
      return (
        '<div class="category-row" data-slug="' + esc(c.slug) + '">' +
          '<input type="text" class="cat-label-input" value="' + esc(c.label) + '">' +
          '<span class="cat-count">' + n + ' item' + (n === 1 ? '' : 's') + '</span>' +
          '<button type="button" class="cat-del" aria-label="Delete category">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
          '</button>' +
        '</div>'
      );
    }).join('');
  }

  function openCategoriesPanel() {
    categoriesError.hidden = true;
    newCategoryInput.value = '';
    renderCategoriesList();
    categoriesOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCategoriesPanel() {
    categoriesOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  manageCategoriesBtn.addEventListener('click', openCategoriesPanel);
  categoriesClose.addEventListener('click', closeCategoriesPanel);
  categoriesDoneBtn.addEventListener('click', closeCategoriesPanel);
  categoriesOverlay.addEventListener('click', function (e) { if (e.target === categoriesOverlay) closeCategoriesPanel(); });

  function reloadCategoriesAndProducts() {
    return Promise.all([api('/api/categories'), api('/api/products')]).then(function (res) {
      state.categories = res[0];
      state.products = res[1];
      fillCategorySelects();
      render();
    });
  }

  categoriesList.addEventListener('change', function (e) {
    var input = e.target.closest('.cat-label-input');
    if (!input) return;
    var row = input.closest('.category-row');
    var slug = row.dataset.slug;
    var label = input.value.trim();
    var current = state.categories.find(function (c) { return c.slug === slug; });
    if (!label) { input.value = current ? current.label : ''; return; }
    if (current && label === current.label) return;
    input.disabled = true;
    api('/api/categories/' + slug, { method: 'PUT', body: JSON.stringify({ label: label }) })
      .then(function () { toast('Category renamed.'); return reloadCategoriesAndProducts(); })
      .then(function () { renderCategoriesList(); })
      .catch(function (err) {
        categoriesError.textContent = err.message;
        categoriesError.hidden = false;
        renderCategoriesList();
      })
      .finally(function () { input.disabled = false; });
  });

  categoriesList.addEventListener('click', function (e) {
    var btn = e.target.closest('.cat-del');
    if (!btn) return;
    var row = btn.closest('.category-row');
    var slug = row.dataset.slug;
    var current = state.categories.find(function (c) { return c.slug === slug; });
    if (!confirm('Delete category "' + (current ? current.label : slug) + '"?')) return;
    categoriesError.hidden = true;
    api('/api/categories/' + slug, { method: 'DELETE' })
      .then(function () { toast('Category deleted.'); return reloadCategoriesAndProducts(); })
      .then(function () { renderCategoriesList(); })
      .catch(function (err) {
        categoriesError.textContent = err.message;
        categoriesError.hidden = false;
      });
  });

  function addCategory() {
    var label = newCategoryInput.value.trim();
    if (!label) return;
    categoriesError.hidden = true;
    addCategoryBtn.disabled = true;
    api('/api/categories', { method: 'POST', body: JSON.stringify({ label: label }) })
      .then(function () {
        toast('Category added.');
        newCategoryInput.value = '';
        return reloadCategoriesAndProducts();
      })
      .then(function () { renderCategoriesList(); })
      .catch(function (err) {
        categoriesError.textContent = err.message;
        categoriesError.hidden = false;
      })
      .finally(function () { addCategoryBtn.disabled = false; });
  }
  addCategoryBtn.addEventListener('click', addCategory);
  newCategoryInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addCategory(); });

  // ---------- Visitor informations ----------
  function formatDay(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function openVisitorsPanel() {
    visitorsList.innerHTML = '';
    visitorsEmpty.hidden = true;
    visitorsCount.textContent = 'Loading…';
    visitorsOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    api('/api/visitors').then(function (rows) {
      visitorsCount.textContent = rows.length + ' submission' + (rows.length === 1 ? '' : 's');
      if (!rows.length) { visitorsEmpty.hidden = false; return; }

      var html = '';
      var currentDay = null;
      var dayCount = 0;
      rows.forEach(function (v, i) {
        var day = formatDay(v.createdAt);
        if (day !== currentDay) {
          currentDay = day;
          dayCount = 0;
          html += '<div class="visitor-day-sep"><span>' + esc(day) + '</span></div>';
        }
        dayCount++;
        html +=
          '<div class="visitor-row">' +
            '<div class="visitor-idx">' + dayCount + '</div>' +
            '<div class="visitor-name">' + esc(v.doctorName) + '</div>' +
            '<div class="visitor-phone"><a href="tel:' + esc(v.phone) + '">' + esc(v.phone) + '</a></div>' +
            '<div class="visitor-time">' + esc(formatTime(v.createdAt)) + '</div>' +
          '</div>';
      });
      visitorsList.innerHTML = html;
    }).catch(function (e) { toast(e.message, true); });
  }

  function closeVisitorsPanel() {
    visitorsOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  viewVisitorsBtn.addEventListener('click', openVisitorsPanel);
  visitorsClose.addEventListener('click', closeVisitorsPanel);
  visitorsDoneBtn.addEventListener('click', closeVisitorsPanel);
  visitorsOverlay.addEventListener('click', function (e) { if (e.target === visitorsOverlay) closeVisitorsPanel(); });

  // ---------- Reorder ----------
  var reorderItems = [];

  function reorderFillCategorySelect() {
    reorderCategorySelect.innerHTML = state.categories.map(function (c) {
      return '<option value="' + c.slug + '">' + c.label + '</option>';
    }).join('');
  }

  function loadReorderList(categorySlug) {
    reorderItems = state.products
      .filter(function (p) { return p.category === categorySlug; })
      .slice();
    renderReorderList();
  }

  function renderReorderList() {
    if (!reorderItems.length) {
      reorderList.innerHTML = '<p class="empty-state">No products in this category yet.</p>';
      return;
    }
    reorderList.innerHTML = reorderItems.map(function (p, i) {
      var img = p.images && p.images[0];
      var thumb = img
        ? '<img class="reorder-thumb" src="' + img.url + '" alt="">'
        : '<span class="reorder-thumb"></span>';
      return (
        '<div class="reorder-row" data-id="' + esc(p.id) + '">' +
          thumb +
          '<span class="reorder-name">' + esc(p.name) + '</span>' +
          '<input type="number" class="reorder-num" inputmode="numeric" min="1" value="' + (i + 1) + '">' +
        '</div>'
      );
    }).join('');
  }

  function openReorderPanel() {
    reorderFillCategorySelect();
    var initial = (categoryFilter.value) || (state.categories[0] && state.categories[0].slug) || '';
    reorderCategorySelect.value = initial;
    loadReorderList(reorderCategorySelect.value);
    reorderOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeReorderPanel() {
    reorderOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  reorderBtn.addEventListener('click', openReorderPanel);
  reorderClose.addEventListener('click', closeReorderPanel);
  reorderCancelBtn.addEventListener('click', closeReorderPanel);
  reorderOverlay.addEventListener('click', function (e) { if (e.target === reorderOverlay) closeReorderPanel(); });
  reorderCategorySelect.addEventListener('change', function () { loadReorderList(reorderCategorySelect.value); });

  reorderSaveBtn.addEventListener('click', function () {
    if (!reorderItems.length) return;
    reorderSaveBtn.disabled = true;

    var rows = Array.prototype.slice.call(reorderList.querySelectorAll('.reorder-row'));
    var withNum = rows.map(function (row, i) {
      var raw = parseFloat(row.querySelector('.reorder-num').value);
      return { id: row.dataset.id, num: isFinite(raw) ? raw : (i + 1), i: i };
    });
    withNum.sort(function (a, b) { return a.num - b.num || a.i - b.i; });
    var ids = withNum.map(function (x) { return x.id; });

    api('/api/products', { method: 'PATCH', body: JSON.stringify({ category: reorderCategorySelect.value, ids: ids }) })
      .then(function () {
        toast('Order saved.');
        return refreshProducts();
      })
      .then(function () {
        loadReorderList(reorderCategorySelect.value);
      })
      .catch(function (e) { toast(e.message, true); })
      .finally(function () { reorderSaveBtn.disabled = false; });
  });

  // ---------- Editor ----------
  function openEditor(product) {
    state.editing = product
      ? Object.assign({}, product, { images: (product.images || []).slice() })
      : { id: null, images: [] };
    editorTitle.textContent = product ? 'Edit product' : 'Add product';
    deleteBtn.hidden = !product;
    saveError.hidden = true;
    imageStatus.textContent = '';

    fName.value = product ? product.name : '';
    fCategory.value = product ? product.category : (state.categories[0] && state.categories[0].slug) || '';
    fDescription.value = product ? (product.description || '') : '';
    fVariants.value = product && product.variants ? product.variants.join('\n') : '';
    fPrice.value = (product && product.price !== undefined && product.price !== null) ? product.price : '';

    renderImageList();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeEditor() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    state.editing = null;
  }
  editorClose.addEventListener('click', closeEditor);
  cancelBtn.addEventListener('click', closeEditor);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeEditor(); });

  function renderImageList() {
    var images = (state.editing && state.editing.images) || [];
    imageList.innerHTML = images.map(function (img) {
      return (
        '<div class="image-thumb" data-image-id="' + img.id + '">' +
          '<img src="' + img.url + '" alt="">' +
          '<button type="button" class="rm-btn" data-remove-image="' + img.id + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>'
      );
    }).join('');
  }

  imageList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-image]');
    if (!btn) return;
    var imgId = btn.dataset.removeImage;
    // Existing (already-saved) products: delete on the server right away.
    if (state.editing.id && state.products.some(function (p) { return p.id === state.editing.id; })) {
      api('/api/images/' + imgId, { method: 'DELETE' }).catch(function (e) { toast(e.message, true); });
    } else {
      // Not uploaded yet — just drop it from the pending upload queue.
      state.pendingImages = state.pendingImages.filter(function (i) { return String(i.id) !== String(imgId); });
    }
    state.editing.images = state.editing.images.filter(function (i) { return String(i.id) !== String(imgId); });
    renderImageList();
  });

  // Resize/compress client-side before upload — keeps things fast on mobile data
  // and well under the request size limit; the server re-compresses again anyway.
  function fileToResizedDataUrl(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () { img.src = reader.result; };
      img.onerror = reject;
      img.onload = function () {
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      reader.readAsDataURL(file);
    });
  }

  imageInput.addEventListener('change', function () {
    var files = Array.from(imageInput.files || []);
    imageInput.value = '';
    if (!files.length) return;

    // If this is a brand-new (unsaved) product, stash images and upload after first save.
    if (!state.editing.id || !state.products.some(function (p) { return p.id === state.editing.id; })) {
      imageStatus.textContent = files.length + ' photo(s) will upload after you save.';
      files.forEach(function (f) {
        var pendingId = 'pending-' + Math.random().toString(36).slice(2);
        var url = URL.createObjectURL(f);
        state.pendingImages.push({ id: pendingId, file: f });
        state.editing.images = state.editing.images || [];
        state.editing.images.push({ id: pendingId, url: url, pending: true });
      });
      renderImageList();
      return;
    }

    uploadFiles(state.editing.id, files);
  });

  function uploadFiles(productId, files) {
    imageStatus.textContent = 'Uploading ' + files.length + ' photo(s)…';
    var chain = Promise.resolve();
    files.forEach(function (file) {
      chain = chain.then(function () {
        return fileToResizedDataUrl(file, 1600, 0.85).then(function (dataUrl) {
          return api('/api/upload', { method: 'POST', body: JSON.stringify({ productId: productId, imageDataUrl: dataUrl }) });
        }).then(function (res) {
          state.editing.images = state.editing.images || [];
          state.editing.images.push({ id: res.id, url: res.url });
          renderImageList();
        }).catch(function (e) {
          toast('Upload failed: ' + e.message, true);
        });
      });
    });
    return chain.then(function () {
      imageStatus.textContent = '';
      return refreshProducts();
    });
  }

  function save() {
    var name = fName.value.trim();
    if (!name) { saveError.textContent = 'Name is required.'; saveError.hidden = false; return; }
    saveError.hidden = true;

    var category = fCategory.value;
    var categoryLabel = (state.categories.find(function (c) { return c.slug === category; }) || {}).label || category;
    var description = fDescription.value.trim();
    var variants = fVariants.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var priceRaw = fPrice.value.trim();
    var price = priceRaw === '' ? null : Number(priceRaw);

    var payload = { name: name, category: category, categoryLabel: categoryLabel, description: description, variants: variants.length ? variants : null, price: price };
    saveBtn.disabled = true;

    var isNew = !state.editing || !state.editing.id || !state.products.some(function (p) { return p.id === state.editing.id; });

    var req = isNew
      ? api('/api/products', { method: 'POST', body: JSON.stringify(payload) })
      : api('/api/products/' + state.editing.id, { method: 'PUT', body: JSON.stringify(payload) });

    req.then(function (res) {
      var id = isNew ? res.id : state.editing.id;
      var pending = state.pendingImages;
      state.pendingImages = [];
      if (isNew && pending.length) {
        state.editing.id = id;
        return uploadFiles(id, pending.map(function (p) { return p.file; })).then(function () { return id; });
      }
      return id;
    }).then(function () {
      toast('Saved.');
      closeEditor();
      return refreshProducts();
    }).catch(function (e) {
      saveError.textContent = 'Could not save: ' + e.message + '. Please tap Save again.';
      saveError.hidden = false;
      toast('Could not save — tap Save again', true);
    }).finally(function () {
      saveBtn.disabled = false;
    });
  }
  saveBtn.addEventListener('click', save);

  deleteBtn.addEventListener('click', function () {
    if (!state.editing || !state.editing.id) return;
    if (!confirm('Delete "' + state.editing.name + '"? This cannot be undone.')) return;
    api('/api/products/' + state.editing.id, { method: 'DELETE' }).then(function () {
      toast('Deleted.');
      closeEditor();
      return refreshProducts();
    }).catch(function (e) { toast(e.message, true); });
  });

  addProductBtn.addEventListener('click', function () {
    state.pendingImages = [];
    openEditor(null);
  });

  downloadPdfBtn.addEventListener('click', function () {
    toast('Generating PDF… this can take a minute, please wait.');
    downloadPdfBtn.disabled = true;
    window.location.href = '/api/catalog-pdf';
    setTimeout(function () { downloadPdfBtn.disabled = false; }, 4000);
  });

  // ---------- Noel decorator (full-screen, live-site WYSIWYG) ----------
  var NOEL_PALETTE = [
    { key: 'santa-hat', src: '/assets/xmas-santa-hat.png', label: 'Santa hat', ratio: 0.9133 },
    { key: 'tree', src: '/assets/xmas-tree.png', label: 'Tree', ratio: 1.1740 },
    { key: 'garland', src: '/assets/xmas-garland.png', label: 'Garland', ratio: 0.3040 }
  ];
  var NOEL_IFRAME_SIZES = {
    desktop: { w: 1280, h: 800 },
    mobile: { w: 390, h: 844 }
  };

  var noelOverlay = document.getElementById('noel-overlay');
  var noelClose = document.getElementById('noel-close');
  var noelSaveBtn = document.getElementById('noel-save-btn');
  var noelClearBtn = document.getElementById('noel-clear-btn');
  var noelPaletteEl = document.getElementById('noel-palette');
  var noelStageEl = document.getElementById('noel-stage');
  var noelIframe = document.getElementById('noel-iframe');
  var noelCanvasEl = document.getElementById('noel-canvas');
  var noelControlsEl = document.getElementById('noel-controls');
  var noelSizeInput = document.getElementById('noel-size-input');
  var noelRotateInput = document.getElementById('noel-rotate-input');
  var noelFrontBtn = document.getElementById('noel-front-btn');
  var noelBackBtn = document.getElementById('noel-back-btn');
  var noelDeleteBtn = document.getElementById('noel-delete-btn');

  // items stored directly in percent form: {id,key,src,ratio,xPct,yPct,wPct,rotation,z}
  var noelData = { desktop: [], mobile: [] };
  var noelActiveBp = 'desktop';
  var noelSelectedId = null;
  var noelIdCounter = 1;
  var noelLoaded = false;
  var noelRect = { w: 0, h: 0 }; // current canvas pixel size, measured from the live iframe

  function noelPaletteByKey(key) {
    for (var i = 0; i < NOEL_PALETTE.length; i++) if (NOEL_PALETTE[i].key === key) return NOEL_PALETTE[i];
    return null;
  }

  function renderNoelPalette() {
    noelPaletteEl.innerHTML = NOEL_PALETTE.map(function (p) {
      return (
        '<button type="button" class="noel-palette-item" data-key="' + p.key + '">' +
          '<img src="' + p.src + '" alt="">' +
          '<span>' + esc(p.label) + '</span>' +
        '</button>'
      );
    }).join('');
  }

  function noelAddItem(key) {
    var pal = noelPaletteByKey(key);
    if (!pal) return;
    var maxZ = 0;
    noelData[noelActiveBp].forEach(function (it) { if (it.z > maxZ) maxZ = it.z; });
    var wPct = 28;
    var item = {
      id: 'n' + (noelIdCounter++),
      key: key, src: pal.src, ratio: pal.ratio,
      xPct: 50 - wPct / 2, yPct: 20, wPct: wPct,
      rotation: 0, z: maxZ + 1
    };
    noelData[noelActiveBp].push(item);
    noelSelectedId = item.id;
    renderNoelItems();
  }

  function noelSelectedItem() {
    var list = noelData[noelActiveBp];
    for (var i = 0; i < list.length; i++) if (list[i].id === noelSelectedId) return list[i];
    return null;
  }

  function noelLocateCanvas() {
    try {
      var doc = noelIframe.contentDocument;
      if (!doc) return false;
      var layer = doc.getElementById('hero-decor-layer');
      if (!layer) return false;
      var rect = layer.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      noelCanvasEl.style.left = rect.left + 'px';
      noelCanvasEl.style.top = rect.top + 'px';
      noelCanvasEl.style.width = rect.width + 'px';
      noelCanvasEl.style.height = rect.height + 'px';
      noelRect.w = rect.width;
      noelRect.h = rect.height;
      return true;
    } catch (e) {
      return false;
    }
  }

  function renderNoelItems() {
    var list = noelData[noelActiveBp];
    var w = noelRect.w, h = noelRect.h;

    noelCanvasEl.innerHTML = list.map(function (item) {
      var itemWpx = (item.wPct / 100) * w;
      var itemHpx = itemWpx * item.ratio;
      var xPx = (item.xPct / 100) * w;
      var yPx = (item.yPct / 100) * h;
      var selected = item.id === noelSelectedId;
      return (
        '<div class="noel-item' + (selected ? ' selected' : '') + '" data-id="' + item.id + '" style="' +
          'left:' + xPx + 'px;top:' + yPx + 'px;width:' + itemWpx + 'px;height:' + itemHpx + 'px;' +
          'transform:rotate(' + item.rotation + 'deg);z-index:' + item.z + ';">' +
          '<img src="' + item.src + '" alt="" draggable="false">' +
          (selected ? (
            '<button type="button" class="noel-del" data-del="' + item.id + '">×</button>' +
            '<div class="noel-resize" data-resize="' + item.id + '"></div>'
          ) : '') +
        '</div>'
      );
    }).join('');

    var sel = noelSelectedItem();
    if (sel) {
      noelControlsEl.classList.add('visible');
      noelSizeInput.value = Math.round(sel.wPct);
      noelRotateInput.value = sel.rotation;
    } else {
      noelControlsEl.classList.remove('visible');
    }
  }

  function noelLoadBreakpoint(bp) {
    var size = NOEL_IFRAME_SIZES[bp];
    noelIframe.style.width = size.w + 'px';
    noelIframe.style.height = size.h + 'px';
    noelStageEl.style.width = size.w + 'px';
    noelStageEl.style.height = size.h + 'px';

    var attempts = 0;
    function tryLocate() {
      attempts++;
      if (noelLocateCanvas()) {
        renderNoelItems();
      } else if (attempts < 40) {
        setTimeout(tryLocate, 150);
      }
    }
    tryLocate();
  }

  function noelSwitchTab(bp) {
    noelActiveBp = bp;
    noelSelectedId = null;
    document.querySelectorAll('.noel-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.bp === bp);
    });
    noelIframe.src = '/?noelEditor=1&bp=' + bp + '&t=' + Date.now();
    noelIframe.onload = function () { noelLoadBreakpoint(bp); };
  }

  document.querySelectorAll('.noel-tab').forEach(function (t) {
    t.addEventListener('click', function () { noelSwitchTab(t.dataset.bp); });
  });

  noelPaletteEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.noel-palette-item');
    if (!btn) return;
    noelAddItem(btn.dataset.key);
  });

  // Drag / resize via pointer events (percent-based, computed against the live canvas rect)
  var noelDrag = null;

  noelCanvasEl.addEventListener('pointerdown', function (e) {
    var delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      var delId = delBtn.dataset.del;
      noelData[noelActiveBp] = noelData[noelActiveBp].filter(function (it) { return it.id !== delId; });
      if (noelSelectedId === delId) noelSelectedId = null;
      renderNoelItems();
      return;
    }

    var resizeHandle = e.target.closest('[data-resize]');
    var itemEl = e.target.closest('.noel-item');
    if (!itemEl) return;
    var id = itemEl.dataset.id;
    noelSelectedId = id;
    var item = noelSelectedItem();
    if (!item) return;

    if (resizeHandle) {
      noelDrag = { type: 'resize', startX: e.clientX, startY: e.clientY, origWpct: item.wPct };
    } else {
      noelDrag = { type: 'move', startX: e.clientX, startY: e.clientY, origXpct: item.xPct, origYpct: item.yPct };
    }
    try { noelCanvasEl.setPointerCapture(e.pointerId); } catch (err) {}
    renderNoelItems();
  });

  noelCanvasEl.addEventListener('pointermove', function (e) {
    if (!noelDrag || !noelRect.w) return;
    var item = noelSelectedItem();
    if (!item) return;
    var dx = e.clientX - noelDrag.startX;
    var dy = e.clientY - noelDrag.startY;

    if (noelDrag.type === 'move') {
      item.xPct = noelDrag.origXpct + (dx / noelRect.w) * 100;
      item.yPct = noelDrag.origYpct + (dy / noelRect.h) * 100;
    } else if (noelDrag.type === 'resize') {
      var deltaPct = (dx / noelRect.w) * 100;
      item.wPct = Math.max(4, noelDrag.origWpct + deltaPct);
    }
    renderNoelItems();
  });

  function noelEndDrag() { noelDrag = null; }
  noelCanvasEl.addEventListener('pointerup', noelEndDrag);
  noelCanvasEl.addEventListener('pointercancel', noelEndDrag);

  noelSizeInput.addEventListener('input', function () {
    var item = noelSelectedItem();
    if (!item) return;
    item.wPct = Math.max(4, Math.min(100, Number(noelSizeInput.value) || 0));
    renderNoelItems();
  });

  noelRotateInput.addEventListener('input', function () {
    var item = noelSelectedItem();
    if (!item) return;
    item.rotation = Math.max(-45, Math.min(45, Number(noelRotateInput.value) || 0));
    renderNoelItems();
  });

  noelFrontBtn.addEventListener('click', function () {
    var item = noelSelectedItem();
    if (!item) return;
    var maxZ = 0;
    noelData[noelActiveBp].forEach(function (it) { if (it.z > maxZ) maxZ = it.z; });
    item.z = maxZ + 1;
    renderNoelItems();
  });
  noelBackBtn.addEventListener('click', function () {
    var item = noelSelectedItem();
    if (!item) return;
    var minZ = 0;
    noelData[noelActiveBp].forEach(function (it) { if (it.z < minZ) minZ = it.z; });
    item.z = minZ - 1;
    renderNoelItems();
  });
  noelDeleteBtn.addEventListener('click', function () {
    noelData[noelActiveBp] = noelData[noelActiveBp].filter(function (it) { return it.id !== noelSelectedId; });
    noelSelectedId = null;
    renderNoelItems();
  });

  noelClearBtn.addEventListener('click', function () {
    if (!confirm('Remove all decorations from the ' + noelActiveBp + ' view?')) return;
    noelData[noelActiveBp] = [];
    noelSelectedId = null;
    renderNoelItems();
  });

  function openNoelPanel() {
    renderNoelPalette();
    noelOverlay.hidden = false;
    document.body.style.overflow = 'hidden';

    function startEditing() {
      noelSwitchTab('desktop');
    }

    if (noelLoaded) { startEditing(); return; }
    api('/api/hero-decor').then(function (value) {
      ['desktop', 'mobile'].forEach(function (bp) {
        noelData[bp] = ((value && value[bp]) || []).map(function (it) {
          return {
            id: 'n' + (noelIdCounter++),
            key: it.key, src: it.src, ratio: it.ratio,
            xPct: it.xPct, yPct: it.yPct, wPct: it.wPct,
            rotation: it.rotation, z: it.z
          };
        });
      });
      noelLoaded = true;
      startEditing();
    }).catch(function (e) {
      toast(e.message, true);
      startEditing();
    });
  }

  function closeNoelPanel() {
    noelOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  noelBtn.addEventListener('click', openNoelPanel);
  noelClose.addEventListener('click', closeNoelPanel);

  noelSaveBtn.addEventListener('click', function () {
    noelSaveBtn.disabled = true;
    var payload = {
      desktop: noelData.desktop.map(function (it) {
        return { key: it.key, src: it.src, ratio: it.ratio, xPct: it.xPct, yPct: it.yPct, wPct: it.wPct, rotation: it.rotation, z: it.z };
      }),
      mobile: noelData.mobile.map(function (it) {
        return { key: it.key, src: it.src, ratio: it.ratio, xPct: it.xPct, yPct: it.yPct, wPct: it.wPct, rotation: it.rotation, z: it.z };
      })
    };
    api('/api/hero-decor', { method: 'POST', body: JSON.stringify(payload) })
      .then(function () { toast('Christmas layout saved — live on the site now.'); })
      .catch(function (e) { toast(e.message, true); })
      .finally(function () { noelSaveBtn.disabled = false; });
  });


  // ---------- Auth gate ----------
  var loginScreen = document.getElementById('login-screen');
  var appRoot = document.getElementById('app');
  var loginForm = document.getElementById('login-form');
  var loginPassword = document.getElementById('login-password');
  var loginError = document.getElementById('login-error');

  function showApp() {
    loginScreen.hidden = true;
    appRoot.hidden = false;
    boot();
  }

  function showLogin() {
    appRoot.hidden = true;
    loginScreen.hidden = false;
    loginPassword.focus();
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    api('/api/auth', { method: 'POST', body: JSON.stringify({ password: loginPassword.value }) })
      .then(function () {
        loginPassword.value = '';
        showApp();
      })
      .catch(function (err) {
        loginError.textContent = err.message || 'Incorrect password.';
        loginError.hidden = false;
      })
      .finally(function () { submitBtn.disabled = false; });
  });

  api('/api/auth').then(function (res) {
    if (res.authenticated) showApp();
    else showLogin();
  }).catch(function () { showLogin(); });
})();
