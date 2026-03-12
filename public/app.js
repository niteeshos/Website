const $ = (s) => document.querySelector(s);
let allProducts = [];
let allCategories = [];
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
    card.style.transitionDelay = `${i * 50}ms`;
    requestAnimationFrame(() => card.classList.add('show'));
  });
}

function getEffectiveCategories() {
  const fromProducts = [...new Set(allProducts.map((p) => p.category).filter(Boolean))]
    .map((slug) => ({ slug, name: slug.charAt(0).toUpperCase() + slug.slice(1) }));

  if (!allCategories.length) return fromProducts;

  const slugs = new Set(allCategories.map((c) => c.slug));
  const merged = [...allCategories];
  fromProducts.forEach((c) => {
    if (!slugs.has(c.slug)) merged.push(c);
  });
  return merged;
}

function renderCategoryChips() {
  const categories = getEffectiveCategories();
  const container = $('#menu-categories');
  const chips = [{ name: 'All', slug: 'all' }, ...categories];

  container.innerHTML = chips.map((c) => `
    <button class="chip ${activeCategory === c.slug ? 'active' : ''}" data-category="${c.slug}">${c.name}</button>
  `).join('');

  container.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      renderCategoryChips();
      renderMenu();
    });
  });
}

function productCard(p) {
  return `
    <article class="card glass hover-lift">
      <img class="food-photo" src="${p.imageUrl}" alt="${p.name}" loading="lazy" />
      <div class="card-content">
        <h3 class="font-playfair">${p.name}</h3>
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <p class="muted">${p.description || ''}</p>
        <p class="pill">${p.category}</p>
      </div>
    </article>
  `;
}

function renderMenu() {
  const container = $('#menu-grid');
  const available = allProducts.filter((p) => p.available);
  const categories = getEffectiveCategories();

  if (!available.length) {
    container.innerHTML = '<p class="muted">No menu items available right now.</p>';
    return;
  }

  if (activeCategory !== 'all') {
    const filtered = available.filter((p) => p.category === activeCategory);
    container.innerHTML = `
      <div class="category-block reveal show">
        <h3 class="category-title font-playfair">${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}</h3>
        <div class="menu-row">${filtered.map(productCard).join('')}</div>
      </div>
    `;
    revealMenuCards();
    return;
  }

  const sections = categories.map((c) => {
    const items = available.filter((p) => p.category === c.slug);
    if (!items.length) return '';
    return `
      <div class="category-block reveal">
        <h3 class="category-title font-playfair">${c.name}</h3>
        <div class="menu-row">${items.map(productCard).join('')}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = sections;
  setupScrollAnimations();
  revealMenuCards();
}

async function bootstrap() {
  const [settings, products, categories] = await Promise.all([
    api('/api/settings'),
    api('/api/products'),
    api('/api/categories')
  ]);

  $('#nav-logo').textContent = settings.restaurantName || 'Café';
  $('#hero-title').textContent = settings.restaurantName || 'Café';
  $('#hero-tagline').textContent = settings.heroTagline || '';
  $('#about-text').textContent = settings.aboutText || '';

  allProducts = products;
  allCategories = categories;
  renderCategoryChips();
  renderMenu();
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
