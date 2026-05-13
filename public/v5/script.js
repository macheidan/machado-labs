// /v5 — small interactions

// Mouse-tracking glow on post cards
document.addEventListener('mousemove', (e) => {
  document.querySelectorAll('.post-card').forEach((card) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x >= -10 && x <= 110 && y >= -10 && y <= 110) {
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    }
  });
});

// Newsletter form (placeholder)
document.querySelectorAll('form.nl-form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button');
    if (!input.value) return;
    button.textContent = 'Obrigado';
    button.disabled = true;
    input.value = '';
    setTimeout(() => { button.textContent = 'Assinar'; button.disabled = false; }, 2400);
  });
});
