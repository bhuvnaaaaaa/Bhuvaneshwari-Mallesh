document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element Selectors ---
  const gridContainer = document.querySelector('.custom-product-grid-container');
  const modal = document.getElementById('product-popup-modal');
  if (!gridContainer || !modal) return; // Exit if essential elements are missing

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
    
    // 1. Populate static content
    modal.querySelector('#popup-product-title').textContent = currentProductData.title;
    modal.querySelector('#popup-product-image').src = currentProductData.featured_image || '';
    modal.querySelector('#popup-product-description').innerHTML = currentProductData.description;
    
    // 2. Render variant options dynamically
    renderVariantSelectors();
    
    // 3. Set initial state (price, button)
    updateVariantState();
    
    // 4. Show the modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('is-visible'), 10); // For transition
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }
  
  function closePopup() {
    modal.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // Match CSS transition duration
  }
  
  // --- Dynamic Variant Rendering ---
  function renderVariantSelectors() {
    const optionsContainer = modal.querySelector('#popup-variant-options');
    optionsContainer.innerHTML = ''; // Clear previous options
    
    currentProductData.options_with_values.forEach((option, index) => {
      const fieldset = document.createElement('fieldset');
      fieldset.classList.add('variant-fieldset');
      
      const legend = document.createElement('legend');
      legend.classList.add('variant-legend');
      legend.textContent = option.name;
      fieldset.appendChild(legend);

      // Render as buttons for the first option (e.g., Color), dropdown for others
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
          if (valueIndex === 0) input.checked = true; // Pre-select first option
          
          const label = document.createElement('label');
          label.htmlFor = inputId;
          label.textContent = value;
          label.classList.add('variant-radio-label');
          
          buttonsWrapper.appendChild(input);
          buttonsWrapper.appendChild(label);
        });
        fieldset.appendChild(buttonsWrapper);
      } else {
        const selectWrapper = document.createElement('div');
        selectWrapper.classList.add('variant-select-wrapper');
        const select = document.createElement('select');
        select.name = `option-${index}`;
        select.classList.add('variant-select');
        option.values.forEach(value => {
            const optionElement = document.createElement('option');
            optionElement.value = value;
            optionElement.textContent = value;
            select.appendChild(optionElement);
        });
        selectWrapper.appendChild(select);
        fieldset.appendChild(selectWrapper);
      }
      optionsContainer.appendChild(fieldset);
    });

    // Add change listeners to new inputs
    optionsContainer.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', updateVariantState);
    });
  }

  // --- State Update and Cart Logic ---
  function updateVariantState() {
    const selectedOptions = Array.from(
      modal.querySelectorAll('#popup-variant-options input:checked, #popup-variant-options select')
    ).map(el => el.value);
    
    const selectedVariant = currentProductData.variants.find(variant => {
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });
    
    const priceEl = modal.querySelector('#popup-product-price');
    const buttonEl = modal.querySelector('#popup-add-to-cart-button');
    const variantIdEl = modal.querySelector('#popup-selected-variant-id');
    const buttonTextEl = buttonEl.querySelector('.button-text');
    
    if (selectedVariant) {
      priceEl.textContent = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(selectedVariant.price / 100);
      variantIdEl.value = selectedVariant.id;
      if (selectedVariant.available) {
        buttonEl.disabled = false;
        buttonTextEl.textContent = 'Add to Cart';
      } else {
        buttonEl.disabled = true;
        buttonTextEl.textContent = 'Sold Out';
      }
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

    // --- SPECIAL CART RULE LOGIC ---
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
    
    // --- Add to Cart API Call ---
    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });
      closePopup();
      // Optional: update cart count or show a success notification
    } catch (e) {
      console.error("Error adding to cart:", e);
      button.querySelector('.button-text').textContent = 'Error!';
    } finally {
        // Re-enable button after a delay
        setTimeout(() => {
            if(!button.disabled){
                button.disabled = false;
            }
        }, 1000);
    }
  }

  // --- Attach Event Listeners ---
  closeButton.addEventListener('click', closePopup);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closePopup(); // Close if clicking on the overlay
  });
  form.addEventListener('submit', handleFormSubmit);
});