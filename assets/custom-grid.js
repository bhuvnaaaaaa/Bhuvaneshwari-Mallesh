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

  // --- ========================================================= ---
  // ---   CORE RENDERING LOGIC - COMPLETELY REWRITTEN AND FIXED   ---
  // --- ========================================================= ---
  function renderOptions() {
    optionsHost.innerHTML = '';
    if (!product.variants || product.variants.length === 0) {
      throw new Error(`Product '${product.title}' has no variants.`);
    }

    const initialVariant = product.variants.find(v => v.available) || product.variants[0];

    // The Shopify API `options` is an array of objects, e.g., [{ name: 'Size', ... }, { name: 'Color', ... }]
    product.options.forEach((option, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'variant-fieldset';
      fieldset.dataset.optionIndex = index;

      const legend = document.createElement('legend');
      legend.className = 'variant-legend';
      // CORRECTLY reads the name property from the option object, fixing '[object Object]'
      legend.textContent = option.name; 
      fieldset.appendChild(legend);

      // ROBUSTLY check by name, not by order/index
      if (option.name.toLowerCase() === 'color') {
        const wrap = document.createElement('div');
        wrap.className = 'variant-buttons';
        option.values.forEach((value, valueIndex) => {
          const id = `opt-${index}-${valueIndex}`;
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = `option-${index}`;
          input.id = id;
          input.value = value;
          input.className = 'variant-radio-input';
          if (value === initialVariant[`option${index + 1}`]) input.checked = true;
          input.addEventListener('change', updateState);
          wrap.appendChild(input);

          const label = document.createElement('label');
          label.htmlFor = id;
          label.className = 'variant-radio-label';
          label.textContent = value;
          wrap.appendChild(label);
        });
        fieldset.appendChild(wrap);
      } else { // Any other option (like 'Size') becomes the custom dropdown
        fieldset.appendChild(createCustomDropdown(option, index, initialVariant));
      }
      optionsHost.appendChild(fieldset);
    });
  }

  function createCustomDropdown(option, index, initialVariant) {
    const initialValue = initialVariant[`option${index + 1}`];
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    wrapper.dataset.selectedValue = initialValue;

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<span>${initialValue}</span><div class="arrow"></div>`;

    const optionsList = document.createElement('ul');
    optionsList.className = 'custom-options';
    optionsList.setAttribute('role', 'listbox');

    option.values.forEach(value => {
      const li = document.createElement('li');
      li.textContent = value;
      li.dataset.value = value;
      li.setAttribute('role', 'option');
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
        wrapper.dataset.selectedValue = e.target.dataset.value;
        trigger.querySelector('span').textContent = e.target.dataset.value;
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        updateState();
      }
    });
    return wrapper;
  }

  function updateState() {
    const selectedOptions = Array.from(optionsHost.querySelectorAll('[data-option-index]')).map((fieldset) => {
      const radio = fieldset.querySelector('input:checked');
      if (radio) return radio.value;
      const dropdown = fieldset.querySelector('.custom-select-wrapper');
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