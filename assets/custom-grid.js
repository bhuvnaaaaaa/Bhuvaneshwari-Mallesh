document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.querySelector('.custom-product-grid-container');
  if (!gridContainer) return;

  // Find the modal *within this section* to avoid conflicts.
  const sectionRoot = gridContainer.closest('[id^="shopify-section"]') || document;
  const modal = sectionRoot.querySelector('#product-popup-modal');
  if (!modal) return;

  const grid = gridContainer.querySelector('.product-grid');
  const closeButton = modal.querySelector('.popup-close-button');
  const form = modal.querySelector('#popup-add-to-cart-form');
  const optionsHost = modal.querySelector('#popup-variant-options');
  const priceEl = modal.querySelector('#popup-product-price');
  const titleEl = modal.querySelector('#popup-product-title');
  const imageEl = modal.querySelector('#popup-product-image');
  const variantIdInput = modal.querySelector('#popup-selected-variant-id');
  const addBtn = modal.querySelector('#popup-add-to-cart-button');
  const addBtnText = addBtn.querySelector('.button-text');

  let product = null;
  let selectedValues = [];

  const formatPrice = (cents) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);

  const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

  async function fetchProduct(handle) {
    const res = await fetch(`/products/${handle}.js`);
    if (!res.ok) throw new Error('Product fetch failed');
    return res.json();
  }

  function openModal() {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(() => (modal.style.display = 'none'), 300);
  }

  function renderOptions(p) {
    optionsHost.innerHTML = '';
    const optionNames = p.options || []; // ["Color","Size",...]
    const variants = p.variants || [];

    // Build values per option from variants
    const valuesByIndex = optionNames.map((_, i) => unique(variants.map(v => v[`option${i + 1}`])));

    // Pick initial selection = first available variant
    const firstAvail = variants.find(v => v.available) || variants[0];
    selectedValues = optionNames.map((_, i) => (firstAvail ? firstAvail[`option${i + 1}`] : valuesByIndex[i]?.[0]));

    optionNames.forEach((name, idx) => {
      const fs = document.createElement('fieldset');
      fs.className = 'variant-fieldset';

      const legend = document.createElement('legend');
      legend.className = 'variant-legend';
      legend.textContent = name;
      fs.appendChild(legend);

      if (idx === 0) {
        const wrap = document.createElement('div');
        wrap.className = 'variant-buttons';
        valuesByIndex[idx].forEach((val, j) => {
          const id = `opt-${idx}-${j}`;
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = `option-${idx}`;
          input.id = id;
          input.value = val;
          input.className = 'variant-radio-input';
          if (val === selectedValues[idx]) input.checked = true;

          const label = document.createElement('label');
          label.htmlFor = id;
          label.className = 'variant-radio-label';
          label.textContent = val;

          input.addEventListener('change', () => {
            selectedValues[idx] = input.value;
            updateState();
          });

          wrap.appendChild(input);
          wrap.appendChild(label);
        });
        fs.appendChild(wrap);
      } else {
        const wrap = document.createElement('div');
        wrap.className = 'variant-select-wrapper';
        const select = document.createElement('select');
        select.className = 'variant-select';
        valuesByIndex[idx].forEach(val => {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val;
          if (val === selectedValues[idx]) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener('change', () => {
          selectedValues[idx] = select.value;
          updateState();
        });
        wrap.appendChild(select);
        fs.appendChild(wrap);
      }

      optionsHost.appendChild(fs);
    });
  }

  function findVariantBySelection(p, values) {
    return (p.variants || []).find(v =>
      values.every((val, i) => v[`option${i + 1}`] === val)
    );
  }

  function updateState() {
    const v = findVariantBySelection(product, selectedValues);
    if (!v) {
      addBtn.disabled = true;
      addBtnText.textContent = 'Unavailable';
      priceEl.textContent = '';
      variantIdInput.value = '';
      return;
    }
    variantIdInput.value = v.id;
    priceEl.textContent = formatPrice(v.price);
    addBtn.disabled = !v.available;
    addBtnText.textContent = v.available ? 'Add to Cart' : 'Sold Out';
  }

  async function handleGridClick(e) {
    const el = e.target.closest('.grid-item');
    if (!el) return;
    const handle = el.dataset.productHandle;
    if (!handle) return;

    try {
      product = await fetchProduct(handle);
      // Fill static UI
      titleEl.textContent = product.title || '';
      imageEl.src = product.featured_image || product.images?.[0] || '';
      imageEl.alt = product.title || 'Product Image';

      renderOptions(product);
      updateState();
      openModal();
    } catch (err) {
      console.error(err);
    }
  }

  async function addToCart(e) {
    e.preventDefault();
    const variantId = variantIdInput.value;
    if (!variantId) return;

    addBtn.disabled = true;
    addBtnText.textContent = 'Adding…';

    const items = [{ id: Number(variantId), quantity: 1 }];

    // Special rule: if Color=Black and Size=M, also add Soft Winter Jacket
    const v = product.variants.find(vr => vr.id == variantId);
    const softHandle = gridContainer.dataset.softJacketHandle;
    if (v && softHandle && v.option1 === 'Black' && (v.option2 === 'M' || v.option2 === 'Medium')) {
      try {
        const r = await fetch(`/products/${softHandle}.js`);
        const jacket = await r.json();
        const jacketVar = (jacket.variants || []).find(x => x.available);
        if (jacketVar) items.push({ id: Number(jacketVar.id), quantity: 1 });
      } catch (e2) { console.warn('Soft Jacket fetch failed', e2); }
    }

    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      closeModal();
    } catch (err) {
      console.error('Add to cart failed', err);
      addBtnText.textContent = 'Error';
      setTimeout(() => { addBtn.disabled = false; addBtnText.textContent = 'Add to Cart'; }, 1200);
    }
  }

  // Wire up
  grid?.addEventListener('click', handleGridClick);
  grid?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGridClick(e);
  });
  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  form?.addEventListener('submit', addToCart);
});
