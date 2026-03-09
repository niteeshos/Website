const $ = (s) => document.querySelector(s);
let allProducts = [];
let activeCategory = 'all';

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('show');
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

function revealMenuCards() {
  document.querySelectorAll('#menu-grid .card').forEach((card, i) => {
    card.classList.add('reveal');
    card.style.transitionDelay = `${i * 80}ms`;
    requestAnimationFrame(() => card.classList.add('show'));
  });
}

function renderCategoryChips(categories) {
  const container = $('#menu-categories');
  const chips = [{ name: 'All', slug: 'all' }, ...categories];
  container.innerHTML = chips.map(c => `<button class="chip ${activeCategory === c.slug ? 'active' : ''}" data-category="${c.slug}">${c.name}</button>`).join('');
  container.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      renderCategoryChips(categories);
      renderMenu(allProducts);
    });
  });
}

function renderMenu(products) {
  const grid = $('#menu-grid');
  const available = products.filter((p) => p.available && (activeCategory === 'all' || p.category === activeCategory));
  grid.innerHTML = available.map(p => `
    <article class="card glass hover-lift">
      <img class="food-photo" src="${p.imageUrl}" alt="${p.name}" loading="lazy" />
      <h3 class="font-playfair">${p.name}</h3>
      <div class="price">$${Number(p.price).toFixed(2)}</div>
      <p class="muted">${p.description}</p>
      <p class="pill">${p.category}</p>
    </article>
  `).join('');

  revealMenuCards();
}

async function bootstrap() {
  const [settings, products, categories] = await Promise.all([
    api('/api/settings'),
    api('/api/products'),
    api('/api/categories')
  ]);

  $('#nav-logo').textContent = settings.restaurantName;
  $('#hero-title').textContent = settings.restaurantName;
  $('#hero-tagline').textContent = settings.heroTagline;
  $('#about-text').textContent = settings.aboutText;

  allProducts = products;
  renderCategoryChips(categories);
  renderMenu(products);
  setupScrollAnimations();

  $('#booking-date').setAttribute('min', new Date().toISOString().split('T')[0]);

  $('#booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: $('#booking-name').value,
      email: $('#booking-email').value,
      phone: $('#booking-phone').value,
      guests: Number($('#booking-guests').value),
      date: $('#booking-date').value,
      time: $('#booking-time').value,
      message: $('#booking-notes').value
    };
    await api('/api/bookings', { method: 'POST', body: JSON.stringify(payload) });
    e.target.reset();
    alert('Reservation submitted successfully.');
  });

  $('#contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: $('#contact-name').value,
      email: $('#contact-email').value,
      message: $('#contact-message').value
    };
    await api('/api/messages', { method: 'POST', body: JSON.stringify(payload) });
    e.target.reset();
    alert('Message sent successfully.');
  });
}

bootstrap().catch((err) => {
  console.error(err);
  alert('Failed to load website data. Please check the server.');
});
