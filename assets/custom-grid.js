document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.querySelector('.custom-product-grid-container');
  if (!gridContainer) return;

  const sectionRoot = gridContainer.closest('[id^="shopify-section"]') || document;
  const modal = sectionRoot.querySelector('#product-popup-modal');
  if (!modal) return;

  // --- Query all modal elements once for efficiency ---
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
  const descriptionEl = modal.querySelector('#popup-product-description');

  let product = null;

  // --- Helper Functions ---
  const formatPrice = (cents) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);

  async function fetchProduct(handle) {
    const res = await fetch(`/products/${handle}.js`);
    if (!res.ok) throw new Error(`Product fetch failed for handle: ${handle}. Is the product published?`);
    return res.json();
  }

  // --- Modal Visibility ---
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

  // --- Core Rendering and State Management ---
  function renderOptions() {
    optionsHost.innerHTML = '';
    if (!product.variants || product.variants.length === 0) {
      throw new Error(`Product '${product.title}' has no variants.`);
    }

    const initialVariant = product.variants.find(v => v.available) || product.variants[0];

    // --- NEW: Sort options to always show 'Color' first visually ---
    const sortedOptions = [...product.options].sort((a, b) => {
        if (a.name.toLowerCase() === 'color') return -1;
        if (b.name.toLowerCase() === 'color') return 1;
        return 0; // Keep original order for other options
    });

    sortedOptions.forEach((option) => {
      // Find the original index to access variant data correctly (e.g., `option1`, `option2`)
      const originalIndex = product.options.findIndex(p_opt => p_opt.name === option.name);

      const fieldset = document.createElement('fieldset');
      fieldset.className = 'variant-fieldset';
      fieldset.dataset.optionIndex = originalIndex;

      const legend = document.createElement('legend');
      legend.className = 'variant-legend';
      legend.textContent = option.name;
      fieldset.appendChild(legend);

      // Render by name, not by order
      if (option.name.toLowerCase() === 'color') {
        fieldset.appendChild(createColorButtons(option, originalIndex, initialVariant));
      } else {
        fieldset.appendChild(createCustomDropdown(option, originalIndex, initialVariant));
      }
      optionsHost.appendChild(fieldset);
    });
  }

  function createColorButtons(option, originalIndex, initialVariant) {
    const wrap = document.createElement('div');
    wrap.className = 'variant-buttons';
    option.values.forEach((value, valueIndex) => {
      const id = `opt-${originalIndex}-${valueIndex}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `option-${originalIndex}`;
      input.id = id;
      input.value = value;
      input.className = 'variant-radio-input';
      if (value === initialVariant[`option${originalIndex + 1}`]) input.checked = true;
      input.addEventListener('change', updateState);
      wrap.appendChild(input);

      const label = document.createElement('label');
      label.htmlFor = id;
      label.className = 'variant-radio-label';
      label.textContent = value;
      wrap.appendChild(label);
    });
    return wrap;
  }

  function createCustomDropdown(option, originalIndex, initialVariant) {
    const initialValue = initialVariant[`option${originalIndex + 1}`];
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.dataset.selectedValue = initialValue; // Store the real value internally

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    // --- NEW: Use placeholder text ---
    trigger.innerHTML = `<span>Choose your size</span><div class="arrow"></div>`;

    const optionsList = document.createElement('ul');
    optionsList.className = 'custom-options';
    optionsList.setAttribute('role', 'listbox');
    option.values.forEach(value => {
      const li = document.createElement('li');
      li.textContent = value;
      li.dataset.value = value;
      li.setAttribute('role', 'option');
      if (value === initialValue) li.classList.add('is-selected');
      optionsList.appendChild(li);
    });
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsList);

    trigger.addEventListener('click', () => {
      wrapper.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', wrapper.classList.contains('is-open'));
    });

    optionsList.addEventListener('click', (e) => {
      if (e.target.tagName === 'LI') {
        const newValue = e.target.dataset.value;
        wrapper.dataset.selectedValue = newValue;
        trigger.querySelector('span').textContent = newValue; // Update displayed text
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');

        // Update visual selection state for the list items
        optionsList.querySelector('.is-selected')?.classList.remove('is-selected');
        e.target.classList.add('is-selected');

        updateState();
      }
    });
    return wrapper;
  }

  function updateState() {
    const selectedOptions = product.options.map((opt, i) => {
        const fieldset = optionsHost.querySelector(`[data-option-index="${i}"]`);
        const radio = fieldset?.querySelector('input:checked');
        if (radio) return radio.value;
        const dropdown = fieldset?.querySelector('.custom-select-wrapper');
        return dropdown ? dropdown.dataset.selectedValue : null;
    });

    const v = product.variants.find(variant =>
      selectedOptions.every((val, i) => variant[`option${i + 1}`] === val)
    );

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

  // --- Event Handlers ---
  async function handleGridClick(e) {
    const el = e.target.closest('.grid-item');
    if (!el || !el.dataset.productHandle) return;
    try {
      addBtnText.textContent = 'Loading...';
      addBtn.disabled = true;
      openModal();
      product = await fetchProduct(el.dataset.productHandle);
      titleEl.textContent = product.title || '';
      imageEl.src = product.featured_image || product.images?.[0] || '';
      descriptionEl.innerHTML = product.description || '';
      renderOptions();
      updateState();
    } catch (err) {
      console.error("Popup failed to load:", err);
      addBtnText.textContent = 'Error Loading';
    }
  }

  async function addToCart(e) {
    e.preventDefault();
    if (!variantIdInput.value) return;
    addBtn.disabled = true;
    addBtnText.textContent = 'Adding…';
    const items = [{ id: Number(variantIdInput.value), quantity: 1 }];
    const softHandle = gridContainer.dataset.softJacketHandle;
    const v = product.variants.find(vr => vr.id == variantIdInput.value);
    if (v && softHandle && v.option1 === 'Black' && (v.option2 === 'M' || v.option2 === 'Medium')) {
      try {
        const jacket = await (await fetch(`/products/${softHandle}.js`)).json();
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
    } finally {
      setTimeout(updateState, 1500);
    }
  }

  // --- Wire up Event Listeners ---
  grid?.addEventListener('click', handleGridClick);
  closeButton?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  form?.addEventListener('submit', addToCart);
  document.addEventListener('click', (e) => {
    const openDropdown = document.querySelector('.custom-select-wrapper.is-open');
    if (openDropdown && !openDropdown.contains(e.target)) {
      openDropdown.classList.remove('is-open');
      openDropdown.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'false');
    }
  });
});