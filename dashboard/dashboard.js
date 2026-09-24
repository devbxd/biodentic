(function () {
  'use strict';

  var API = ''; // same-origin: /api/...
  var state = { products: [], categories: [], filter: '', search: '', editing: null, pendingImages: [] };

  var app = document.getElementById('app');

  var searchInput = document.getElementById('search-input');
  var categoryFilter = document.getElementById('category-filter');
  var addProductBtn = document.getElementById('add-product-btn');
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

  function toast(msg, isError) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (isError ? ' error' : '');
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    options.credentials = 'same-origin';
    return fetch(API + path, options).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
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
        '<button class="p-card" data-id="' + esc(p.id) + '">' +
          '<div class="p-card-media">' + media + '</div>' +
          '<div class="p-card-body">' +
            '<div class="p-card-cat">' + esc(p.categoryLabel) + '</div>' +
            '<div class="p-card-name">' + esc(p.name) + '</div>' +
            countBadge +
          '</div>' +
        '</button>'
      );
    }).join('');
  }

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.p-card');
    if (!card) return;
    var p = state.products.find(function (x) { return x.id === card.dataset.id; });
    if (p) openEditor(p);
  });

  searchInput.addEventListener('input', function () { state.search = searchInput.value; render(); });
  categoryFilter.addEventListener('change', function () { state.filter = categoryFilter.value; render(); });

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

    var payload = { name: name, category: category, categoryLabel: categoryLabel, description: description, variants: variants.length ? variants : null };
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
      saveError.textContent = e.message;
      saveError.hidden = false;
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

  boot();
})();
