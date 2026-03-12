const form = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  try {
    const result = await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
      })
    });

    localStorage.setItem('adminToken', result.token);
    window.location.href = '/admin/dashboard';
  } catch {
    errorBox.style.display = 'block';
  }
});
