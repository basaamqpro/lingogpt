const menuBtn = document.getElementById('menu-btn');
const closeBtn = document.getElementById('close-btn');
const slideMenu = document.getElementById('slide-menu');

// Expand the width to 100%
menuBtn.addEventListener('click', () => {
  slideMenu.classList.add('open');
});

// Shrink the width to 0%
closeBtn.addEventListener('click', () => {
  slideMenu.classList.remove('open');
});
