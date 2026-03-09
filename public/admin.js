const $ = (s) => document.querySelector(s);
const adminToken = localStorage.getItem('adminToken');
if (!adminToken) window.location.href = '/admin';

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    ...options
  });

  if (res.status === 401) {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
  return data;
}

let products = [];
let bookings = [];
let messages = [];
let categories = [];

function refreshCategoryOptions() {
  $('#product-category').innerHTML = categories.map((c) => `<option value="${c.slug}">${c.name}</option>`).join('');
  $('#categories-list').innerHTML = categories.map((c) => `<button class="chip active" onclick="deleteCategory('${c.id}')">${c.name} ✕</button>`).join('');
}

function resetForm() {
  $('#product-id').value = '';
  $('#product-form').reset();
  $('#product-imageUrl').value = '';
  $('#product-available').checked = true;
}

function renderProducts() {
  $('#products-tbody').innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.imageUrl}" alt="${p.name}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-right:8px">${p.name}</td>
      <td>${p.category}</td>
      <td>$${Number(p.price).toFixed(2)}</td>
      <td>${p.available ? 'Available' : 'Hidden'}</td>
      <td class="actions">
        <button class="warn" onclick="editProduct('${p.id}')">Edit</button>
        <button class="bad" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderBookings() {
  $('#bookings-tbody').innerHTML = bookings.map(b => `
    <tr>
      <td>${b.name}</td><td>${b.date} ${b.time}</td><td>${b.guests}</td><td>${b.status}</td>
      <td class="actions">
        <button class="ok" onclick="updateBookingStatus('${b.id}','confirmed')">Confirm</button>
        <button class="warn" onclick="updateBookingStatus('${b.id}','pending')">Pending</button>
        <button class="bad" onclick="deleteBooking('${b.id}')">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5">No bookings yet.</td></tr>';
}

function renderMessages() {
  $('#messages-tbody').innerHTML = messages.map(m => `
    <tr><td>${m.name}</td><td>${m.email}</td><td>${m.message}</td><td class="actions"><button class="bad" onclick="deleteMessage('${m.id}')">Delete</button></td></tr>
  `).join('') || '<tr><td colspan="4">No messages yet.</td></tr>';
}

window.editProduct = function (id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  $('#product-id').value = p.id;
  $('#product-name').value = p.name;
  $('#product-price').value = p.price;
  $('#product-category').value = p.category;
  $('#product-imageUrl').value = p.imageUrl;
  $('#product-description').value = p.description;
  $('#product-available').checked = p.available;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async function (id) {
  await api(`/api/products/${id}`, { method: 'DELETE' });
  await loadData();
};

window.updateBookingStatus = async function (id, status) {
  await api(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  await loadData();
};

window.deleteBooking = async function (id) {
  await api(`/api/bookings/${id}`, { method: 'DELETE' });
  await loadData();
};

window.deleteMessage = async function (id) {
  await api(`/api/messages/${id}`, { method: 'DELETE' });
  await loadData();
};

window.deleteCategory = async function (id) {
  await api(`/api/categories/${id}`, { method: 'DELETE' });
  await loadData();
};

async function loadData() {
  await api('/api/admin/verify');
  [products, bookings, messages, categories] = await Promise.all([
    api('/api/products'),
    api('/api/bookings'),
    api('/api/messages'),
    api('/api/categories')
  ]);
  refreshCategoryOptions();
  renderProducts();
  renderBookings();
  renderMessages();
}

$('#category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name: $('#category-name').value })
  });
  e.target.reset();
  await loadData();
});

$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#product-id').value;
  const payload = {
    name: $('#product-name').value,
    price: Number($('#product-price').value),
    category: $('#product-category').value,
    imageUrl: $('#product-imageUrl').value,
    description: $('#product-description').value,
    available: $('#product-available').checked
  };

  if (id) await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  else await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });

  resetForm();
  await loadData();
});

$('#reset-btn').addEventListener('click', resetForm);
$('#logout-btn').addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  window.location.href = '/admin';
});

loadData().catch((err) => {
  console.error(err);
  alert('Failed to load admin data.');
});
