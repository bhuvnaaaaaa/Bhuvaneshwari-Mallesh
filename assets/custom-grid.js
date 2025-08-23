document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element Selectors ---
  const gridContainer = document.querySelector('.custom-product-grid-container');
  const modal = document.getElementById('product-popup-modal');
  if (!gridContainer || !modal) return;

  const grid = gridContainer.querySelector('.product-grid');
  const closeButton = modal.querySelector('.popup-close-button');
  const form = modal.querySelector('#popup-add-to-cart-form');
  
  // --- State Variable ---
  let currentProductData = null;

  // --- Main Event Listener for Grid Clicks (Event Delegation) ---
  grid.addEventListener('click', (event) => {
    const gridItem = event.target.closest('.grid-item');
    if (gridItem) {
      const productJson = gridItem.dataset.productJson;
      if (productJson) {
        currentProductData = JSON.parse(productJson);
        openPopup();
      }
    }
  });
  
  // --- Popup Functions ---
  function openPopup() {
    if (!currentProductData) return;
    
    modal.querySelector('#popup-product-title').textContent = currentProductData.title;
    modal.querySelector('#popup-product-image').src = currentProductData.featured_image || '';
    modal.querySelector('#popup-product-description').innerHTML = currentProductData.description;
    
    renderVariantSelectors();
    updateVariantState();
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('is-visible'), 10);
    document.body.style.overflow = 'hidden';
  }
  
  function closePopup() {
    modal.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
  }
  
  // --- Dynamic Variant Rendering ---
  function renderVariantSelectors() {
    const optionsContainer = modal.querySelector('#popup-variant-options');
    optionsContainer.innerHTML = '';
    
    currentProductData.options_with_values.forEach((option, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.classList.add('variant-fieldset');
      
      const legend = document.createElement('legend');
      legend.classList.add('variant-legend');
      legend.textContent = option.name;
      fieldset.appendChild(legend);

      // Option 1: Render as styled radio buttons (e.g., Color)
      if (index === 0) {
        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.classList.add('variant-buttons');
        option.values.forEach((value, valueIndex) => {
          const inputId = `option-${index}-${valueIndex}`;
          const input = document.createElement('input');
          input.type = 'radio';
          input.id = inputId;
          input.name = `option-${index}`;
          input.value = value;
          input.classList.add('variant-radio-input');
          if (valueIndex === 0) input.checked = true;
          
          const label = document.createElement('label');
          label.htmlFor = inputId;
          label.textContent = value;
          label.classList.add('variant-radio-label');
          
          buttonsWrapper.appendChild(input);
          buttonsWrapper.appendChild(label);
        });
        fieldset.appendChild(buttonsWrapper);
      } 
      // Other Options: Render as a custom dropdown (e.g., Size)
      else {
        fieldset.appendChild(createCustomDropdown(option, index));
      }
      optionsContainer.appendChild(fieldset);
    });

    optionsContainer.querySelectorAll('input').forEach(el => {
      el.addEventListener('change', updateVariantState);
    });
  }

  function createCustomDropdown(option, index) {
    const initialValue = option.values[0];
    
    const wrapper = document.createElement('div');
    wrapper.classList.add('custom-select-wrapper');
    wrapper.dataset.optionIndex = `option-${index}`;
    wrapper.dataset.selectedValue = initialValue;

    const trigger = document.createElement('div');
    trigger.classList.add('custom-select-trigger');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = `<span>${initialValue}</span><div class="arrow"></div>`;
    
    const optionsList = document.createElement('ul');
    optionsList.classList.add('custom-options');
    optionsList.setAttribute('role', 'listbox');

    option.values.forEach(value => {
      const optionElement = document.createElement('li');
      optionElement.textContent = value;
      optionElement.dataset.value = value;
      optionElement.setAttribute('role', 'option');
      optionsList.appendChild(optionElement);
    });
    
    wrapper.appendChild(trigger);
    wrapper.appendChild(optionsList);

    // Event listeners for custom dropdown
    trigger.addEventListener('click', () => {
      wrapper.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', wrapper.classList.contains('is-open'));
    });

    optionsList.addEventListener('click', (e) => {
      if (e.target.tagName === 'LI') {
        const newValue = e.target.dataset.value;
        wrapper.dataset.selectedValue = newValue;
        trigger.querySelector('span').textContent = newValue;
        wrapper.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        updateVariantState();
      }
    });
    
    return wrapper;
  }

  // --- State Update and Cart Logic ---
  function updateVariantState() {
    const selectedOptions = [];
    currentProductData.options_with_values.forEach((option, index) => {
        const checkedRadio = modal.querySelector(`input[name="option-${index}"]:checked`);
        if (checkedRadio) {
            selectedOptions.push(checkedRadio.value);
        } else {
            const customSelect = modal.querySelector(`.custom-select-wrapper[data-option-index="option-${index}"]`);
            if (customSelect) {
                selectedOptions.push(customSelect.dataset.selectedValue);
            }
        }
    });
    
    const selectedVariant = currentProductData.variants.find(variant => 
      variant.options.every((option, index) => option === selectedOptions[index])
    );
    
    const priceEl = modal.querySelector('#popup-product-price');
    const buttonEl = modal.querySelector('#popup-add-to-cart-button');
    const variantIdEl = modal.querySelector('#popup-selected-variant-id');
    const buttonTextEl = buttonEl.querySelector('.button-text');
    
    if (selectedVariant) {
      priceEl.textContent = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(selectedVariant.price / 100);
      variantIdEl.value = selectedVariant.id;
      buttonEl.disabled = !selectedVariant.available;
      buttonTextEl.textContent = selectedVariant.available ? 'Add to Cart' : 'Sold Out';
    } else {
      buttonEl.disabled = true;
      buttonTextEl.textContent = 'Unavailable';
    }
  }
  
  async function handleFormSubmit(event) {
    event.preventDefault();
    
    const variantId = form.querySelector('#popup-selected-variant-id').value;
    if (!variantId) return;

    const button = form.querySelector('#popup-add-to-cart-button');
    button.disabled = true;
    button.querySelector('.button-text').textContent = 'Adding...';

    let itemsToAdd = [{ id: variantId, quantity: 1 }];

    const selectedVariant = currentProductData.variants.find(v => v.id == variantId);
    const softJacketHandle = gridContainer.dataset.softJacketHandle;
    
    if (selectedVariant && softJacketHandle && selectedVariant.option1 === 'Black' && selectedVariant.option2 === 'M') {
      try {
        const res = await fetch(`/products/${softJacketHandle}.js`);
        const jacketData = await res.json();
        const jacketVariantId = jacketData.variants.find(v => v.available)?.id;
        if (jacketVariantId) {
          itemsToAdd.push({ id: jacketVariantId, quantity: 1 });
        }
      } catch (e) {
        console.error("Could not fetch special product:", e);
      }
    }
    
    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });
      closePopup();
    } catch (e) {
      console.error("Error adding to cart:", e);
      button.querySelector('.button-text').textContent = 'Error!';
    } finally {
        setTimeout(() => {
            if (button.querySelector('.button-text').textContent !== 'Add to Cart') {
               updateVariantState(); // Re-check availability and update button
            }
        }, 1500);
    }
  }

  // --- Attach Global Event Listeners ---
  closeButton.addEventListener('click', closePopup);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closePopup();
  });
  document.addEventListener('click', (event) => {
    const openDropdown = document.querySelector('.custom-select-wrapper.is-open');
    if (openDropdown && !openDropdown.contains(event.target)) {
        openDropdown.classList.remove('is-open');
        openDropdown.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'false');
    }
  });
  form.addEventListener('submit', handleFormSubmit);
});