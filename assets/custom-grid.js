document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.querySelector('.custom-product-grid-container');
  if (!gridContainer) return;

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
    const optionNames = p.options || []; 
    const variants = p.variants || [];

    const valuesByIndex = optionNames.map((_, i) => unique(variants.map(v => v[`option${i + 1}`])));

    const firstAvail = variants.find(v => v.available) || variants[0];
    selectedValues = optionNames.map((_, i) => (firstAvail ? firstAvail[`option${i + 1}`] : valuesByIndex[i]?.[0]));

    optionNames.forEach((name, idx) => {
      const fs = document.createElement('fieldset');
      fs.className = 'variant-fieldset';

      const legend = document.createElement('legend');
      legend.className = 'variant-legend';
      legend.textContent = name;
      fs.appendChild(legend);

      // Color (buttons)
      if (name.toLowerCase() === "color") {
        const wrap = document.createElement('div');
        wrap.className = 'variant-buttons';
        valuesByIndex[idx].forEach((val, j) => {
          const btn = document.createElement('button');
          btn.type = "button";
          btn.className = 'color-button';
          btn.textContent = val;
          if (val === selectedValues[idx]) btn.classList.add('active');

          btn.addEventListener('click', () => {
            selectedValues[idx] = val;
            wrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateState();
          });

          wrap.appendChild(btn);
        });
        fs.appendChild(wrap);
      } 
      // Size (custom dropdown)
      else if (name.toLowerCase() === "size") {
        const dropdown = document.createElement('div');
        dropdown.className = 'custom-dropdown';

        const selected = document.createElement('div');
        selected.className = 'dropdown-selected';
        selected.textContent = selectedValues[idx];

        const list = document.createElement('ul');
        list.className = 'dropdown-options';

        valuesByIndex[idx].forEach(val => {
          const li = document.createElement('li');
          li.textContent = val;
          if (val === selectedValues[idx]) li.classList.add('active');

          li.addEventListener('click', () => {
            selectedValues[idx] = val;
            selected.textContent = val;
            list.querySelectorAll('li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            dropdown.classList.remove('open');
            updateState();
          });

          list.appendChild(li);
        });

        selected.addEventListener('click', () => {
          dropdown.classList.toggle('open');
        });

        dropdown.appendChild(selected);
        dropdown.appendChild(list);
        fs.appendChild(dropdown);
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

  grid?.addEventListener('click', handleGridClick);
  grid?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGridClick(e);
  });
  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  form?.addEventListener('submit', addToCart);
});
