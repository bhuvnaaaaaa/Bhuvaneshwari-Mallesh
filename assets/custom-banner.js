// This file contains the JavaScript functionality for the custom banner, including event listeners for button animations and any dynamic behavior required for the banner.

document.addEventListener('DOMContentLoaded', function() {
  // Animate both buttons
  document.querySelectorAll('.shop-now-btn, .choose-gift-btn').forEach(button => {
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
    button.addEventListener('click', () => {
      // Add any additional click functionality here if needed
      // console.log('Button clicked:', button.textContent);
    });
  });
});
