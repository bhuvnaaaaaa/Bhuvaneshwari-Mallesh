// This file contains the JavaScript functionality for the product grid, including the logic for displaying products and handling the popup functionality.

document.addEventListener('DOMContentLoaded', function() {
    const productGrid = document.querySelector('.custom-product-grid');
    const popup = document.querySelector('.product-popup');
    const popupCloseButton = popup.querySelector('.popup-close');
    const addToCartButton = popup.querySelector('.add-to-cart-button');
    let currentProduct = null;

    // Function to open the popup with product details
    function openPopup(product) {
        currentProduct = product;
        popup.querySelector('.product-name').textContent = product.name;
        popup.querySelector('.product-price').textContent = product.price;
        popup.querySelector('.product-description').textContent = product.description;

        // Populate variants
        const variantsContainer = popup.querySelector('.product-variants');
        variantsContainer.innerHTML = '';
        product.variants.forEach(variant => {
            const variantOption = document.createElement('option');
            variantOption.value = variant.id;
            variantOption.textContent = variant.title;
            variantsContainer.appendChild(variantOption);
        });

        popup.classList.add('active');
    }

    // Function to close the popup
    function closePopup() {
        popup.classList.remove('active');
        currentProduct = null;
    }

    // Event listener for closing the popup
    popupCloseButton.addEventListener('click', closePopup);

    // Event listener for the add to cart button
    addToCartButton.addEventListener('click', function() {
        if (currentProduct) {
            const selectedVariantId = popup.querySelector('.product-variants').value;
            addToCart(selectedVariantId);
            closePopup();
        }
    });

    // Function to add the product to the cart
    function addToCart(variantId) {
        fetch('/cart/add.js', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: variantId, quantity: 1 }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Product added to cart:', data);
            // Check for specific variant condition to add the additional product
            if (variantId === 'black-medium-variant-id') { // Replace with actual variant ID
                addToCart('soft-winter-jacket-variant-id'); // Replace with actual variant ID
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    }

    // Event listener for product blocks
    const productBlocks = productGrid.querySelectorAll('.product-block');
    productBlocks.forEach(block => {
        block.addEventListener('click', function() {
            const productData = {
                name: block.dataset.productName,
                price: block.dataset.productPrice,
                description: block.dataset.productDescription,
                variants: JSON.parse(block.dataset.productVariants)
            };
            openPopup(productData);
        });
    });

    // Color button selection logic
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Size dropdown hover effect (works in some browsers)
    const style = document.createElement('style');
    style.innerHTML = `
        .size-select option:hover, .size-select option:focus {
            background: #111 !important;
            color: #fff !important;
        }
    `;
    document.head.appendChild(style);
});