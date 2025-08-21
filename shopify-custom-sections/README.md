# Shopify Custom Sections

This project contains custom sections for a Shopify store, specifically a custom banner and a product grid. The sections are built from scratch without using any pre-made components from the Dawn theme. Below are the details of the files and their functionalities.

## Project Structure

```
shopify-custom-sections
├── sections
│   ├── custom-banner.liquid        # Defines the custom banner section with editable text and animations.
│   └── custom-product-grid.liquid  # Defines the custom product grid section displaying selectable products.
├── assets
│   ├── custom-banner.js             # JavaScript for the custom banner functionality and animations.
│   ├── custom-banner.css            # CSS styles specific to the custom banner.
│   ├── custom-grid.js               # JavaScript for the product grid functionality and popup handling.
│   ├── custom-grid.css              # CSS styles specific to the product grid.
│   └── vectors
│       ├── vector1.svg              # SVG vector graphic used in the banner.
│       └── vector2.svg              # Another SVG vector graphic used in the banner.
├── snippets
│   └── product-popup.liquid         # HTML structure for the product popup with details and "ADD TO CART" button.
├── config
│   └── settings_schema.json         # Settings schema for the Shopify customizer.
├── locales
│   └── en.default.json             # Localization strings for the project.
├── README.md                        # Documentation for the project.
```

## Features

1. **Custom Banner**: 
   - Editable text fields for customization.
   - Button animations for enhanced user interaction.
   - Integration of vector images for visual appeal.

2. **Product Grid**:
   - Displays six product blocks, each selectable from the customizer.
   - Responsive design for mobile view.
   - Popup functionality to show product details, including name, price, description, and variants.

3. **Popup Functionality**:
   - Displays product information dynamically.
   - Functional "ADD TO CART" button that adds the selected product to the cart.
   - Special logic to automatically add related products based on selected variants.

## Setup Instructions

1. Clone the repository to your local machine.
2. Navigate to the `shopify-custom-sections` directory.
3. Upload the contents to your Shopify store.
4. Connect the sections to your desired pages through the Shopify theme customizer.
5. Customize the banner text and select products for the grid as needed.

## Notes

- Ensure that all JavaScript is written in vanilla JavaScript, avoiding the use of jQuery.
- The project is structured for easy maintenance and scalability.
- All styles are responsive to ensure a good user experience on mobile devices.

For any issues or contributions, please feel free to open an issue or submit a pull request.