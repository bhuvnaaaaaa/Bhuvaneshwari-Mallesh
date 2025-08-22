// This file contains the JavaScript functionality for the custom banner, including event listeners for button animations and any dynamic behavior required for the banner.

document.addEventListener('DOMContentLoaded', function() {
        // Button scale animation
    document.querySelectorAll('.banner-button, .choose-gift-btn').forEach(button => {
      button.addEventListener('mouseover', function() {
        this.classList.add('active');
      });
      button.addEventListener('mouseout', function() {
        this.classList.remove('active');
      });
      button.addEventListener('touchstart', function() {
        this.classList.add('active');
      });
      button.addEventListener('touchend', function() {
        this.classList.remove('active');
      });
    });
  });
    const buttons = document.querySelectorAll('.banner-button');

    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.classList.add('animate');
        });

        button.addEventListener('mouseleave', () => {
            button.classList.remove('animate');
        });

        button.addEventListener('click', () => {
            // Add any additional click functionality here if needed
            console.log('Button clicked:', button.textContent);
        });
    });
