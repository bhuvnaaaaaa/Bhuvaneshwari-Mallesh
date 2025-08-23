// This file contains the JavaScript functionality for the product grid, including the logic for displaying products and handling the popup functionality.

/* assets/custom-grid.js
   Vanilla JS: product popup + dynamic variants + add-to-cart + auto-add jacket rule
   Required DOM:
   - product blocks: .product-block with attributes:
       data-product-id, data-product-name, data-product-price, data-product-description,
       data-product-variants (product.variants | json from Liquid)
     and must contain an <img> inside (featured image).
   - single popup:
     <div class="product-popup"> ... children: .popup-overlay, .popup-close,
         .product-image, .product-name, .product-price, .product-description,
         .product-variants (select), .add-to-cart-button
     </div>
*/

(function () {
  // === CONFIG - update this handle if your jacket has a different handle ===
  var SOFT_JACKET_HANDLE = 'soft-winter-jacket'; // <-- replace with the real handle if different

  // --- helpers ---
  function tryParseJSON(str) {
    if (!str) return null;
    try { return JSON.parse(str); } catch (e) {
      // attempt to unescape common HTML entities then parse
      var unescaped = str
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      try { return JSON.parse(unescaped); } catch (e2) { return null; }
    }
  }

  function addToCartVariant(variantId, qty) {
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: qty || 1 })
    })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw err; });
      return res.json();
    });
  }

  function fetchProductByHandle(handle) {
    return fetch('/products/' + encodeURIComponent(handle) + '.js')
      .then(function (res) {
        if (!res.ok) throw new Error('Product fetch failed for ' + handle);
        return res.json();
      });
  }

  // --- DOM elements ---
  var popup = document.querySelector('.product-popup');
  if (!popup) {
    console.warn('custom-grid.js: .product-popup element not found — popup will not work.');
    return;
  }
  var popupOverlay = popup.querySelector('.popup-overlay');
  var popupClose = popup.querySelector('.popup-close');
  var popupImage = popup.querySelector('.product-image');
  var popupName = popup.querySelector('.product-name');
  var popupPrice = popup.querySelector('.product-price');
  var popupDescription = popup.querySelector('.product-description');
  var popupVariantsSelect = popup.querySelector('.product-variants');
  var popupAddBtn = popup.querySelector('.add-to-cart-button');

  if (!popupVariantsSelect || !popupAddBtn) {
    console.warn('custom-grid.js: required popup children (.product-variants or .add-to-cart-button) missing.');
  }

  // utility to open/close
  function showPopup() { popup.classList.remove('hidden'); popup.classList.add('active'); document.body.style.overflow = 'hidden'; }
  function hidePopup() { popup.classList.add('hidden'); popup.classList.remove('active'); document.body.style.overflow = ''; }

  popupOverlay && popupOverlay.addEventListener('click', hidePopup);
  popupClose && popupClose.addEventListener('click', hidePopup);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hidePopup(); });

  // --- render popup for a product block ---
  function openPopupFromBlock(block) {
    // read data from block
    var name = block.getAttribute('data-product-name') || '';
    var price = block.getAttribute('data-product-price') || '';
    var desc = block.getAttribute('data-product-description') || '';
    var variantsJson = block.getAttribute('data-product-variants') || '';
    var imgEl = block.querySelector('img');
    var imageSrc = imgEl ? imgEl.src : '';

    // parse variants safely
    var variants = tryParseJSON(variantsJson) || [];
    // Normalize variant objects into { id, title, options: [] }
    variants = variants.map(function (v) {
      var opts = [];
      // support both .options array (Shopify API) or option1/2/3 properties (Liquid)
      if (Array.isArray(v.options) && v.options.length) {
        opts = v.options;
      } else {
        if (v.option1) opts.push(v.option1);
        if (v.option2) opts.push(v.option2);
        if (v.option3) opts.push(v.option3);
      }
      return {
        id: v.id,
        title: v.title || (opts.join(' / ') || ''),
        price: v.price || v.price_including_tax || null,
        options: opts
      };
    });

    // fill popup fields
    popupName.textContent = name;
    popupPrice.textContent = price;
    popupDescription.textContent = desc;
    popupImage && (popupImage.src = imageSrc);

    // populate variants select
    if (popupVariantsSelect) {
      popupVariantsSelect.innerHTML = ''; // reset
      variants.forEach(function (v, idx) {
        var opt = document.createElement('option');
        opt.value = String(v.id);
        opt.textContent = v.title || v.options.join(' / ');
        popupVariantsSelect.appendChild(opt);
      });
      // store variants for later use on the add click
      popupVariantsSelect._variants = variants;
    }

    // show
    showPopup();
  }

  // Attach click handlers on product blocks
  document.querySelectorAll('.product-block').forEach(function (block) {
    // prefer the small + button if exists
    var btn = block.querySelector('.view-details');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openPopupFromBlock(block);
      });
    } else {
      // fallback: clicking the block opens popup
      block.addEventListener('click', function () { openPopupFromBlock(block); });
    }
  });

  // Add to cart logic
  popupAddBtn && popupAddBtn.addEventListener('click', function () {
    var selectedVariantId = popupVariantsSelect && popupVariantsSelect.value;
    if (!selectedVariantId) {
      alert('Please select a variant.');
      return;
    }

    popupAddBtn.disabled = true;
    popupAddBtn.textContent = 'Adding...';

    addToCartVariant(selectedVariantId, 1)
      .then(function (added) {
        // added is the cart item object returned by Shopify
        // Now check the added variant options (we can find it from the popupVariantsSelect._variants)
        var variants = (popupVariantsSelect && popupVariantsSelect._variants) || [];
        var chosen = variants.find(function (v) { return String(v.id) === String(selectedVariantId); }) || null;
        var optionValues = (chosen && chosen.options || []).map(function (o) { return (o||'').toString().toLowerCase(); });

        // Check for Black + Medium (case-insensitive)
        if (optionValues.indexOf('black') !== -1 && optionValues.indexOf('medium') !== -1) {
          // fetch jacket product then add its first variant
          fetchProductByHandle(SOFT_JACKET_HANDLE)
            .then(function (jprod) {
              if (jprod && Array.isArray(jprod.variants) && jprod.variants.length) {
                var jacketVariantId = jprod.variants[0].id;
                return addToCartVariant(jacketVariantId, 1);
              } else {
                console.warn('Soft jacket product has no variants or failed to load.');
              }
            })
            .catch(function (err) {
              console.warn('Failed to auto-add soft jacket:', err);
            })
            .finally(function () {
              popupAddBtn.disabled = false;
              popupAddBtn.textContent = 'Add to Cart';
              hidePopup();
              // Optionally show cart/notification here
            });
        } else {
          popupAddBtn.disabled = false;
          popupAddBtn.textContent = 'Add to Cart';
          hidePopup();
        }
      })
      .catch(function (err) {
        var msg = (err && err.description) ? err.description : (err && err.message) ? err.message : 'Add to cart failed';
        console.error('Add to cart error:', err);
        alert('Add to cart failed: ' + msg);
        popupAddBtn.disabled = false;
        popupAddBtn.textContent = 'Add to Cart';
      });
  });

})();
