/* FILE: expense_script.js
   CHANGED: Replaced PHP AJAX with REST API calls to Lambda (via API Gateway).
   IMPORTANT: Set EXPENSE_API_URL to your API Gateway base URL (no trailing slash).
*/

const EXPENSE_API_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';

// === PERUBAHAN: AMBIL USER ID DARI LOGIN ===
const CURRENT_USER_ID = localStorage.getItem('user_id');
const CURRENT_USER_NAME = localStorage.getItem('user_name');

// Cek apakah user sudah login
if (!CURRENT_USER_ID) {
    alert("You are not logged in!");
    window.location.href = 'login.html'; // Tendang ke halaman login
}

// Tampilkan nama user di navbar (jika elemen ada)
const welcomeName = document.getElementById('welcomeName');
if (welcomeName && CURRENT_USER_NAME) {
    welcomeName.textContent = `Welcome, ${CURRENT_USER_NAME}!`;
}

let itemCounter = 1;
let categories = [];

// DOM
const expenseForm = document.getElementById('expenseForm');
const groupsContainer = document.getElementById('groupCheckboxes');
const dropdownInput = document.getElementById('dropdownInput');
const dropdownList = document.getElementById('dropdownList');
const hiddenCategoryInput = document.getElementById('categoryNameInput');
const subtotalInput = document.getElementById('subtotal');
const totalAmountEl = document.getElementById('totalAmount');
const grandTotalInput = document.getElementById('grandTotalInput');
const taxInput = document.getElementById('tax');
const serviceInput = document.getElementById('service');
const discountInput = document.getElementById('discount');
const invoiceInput = document.getElementById('invoiceUpload');

// Utils (currency)
function formatRupiah(value) {
  const number = parseInt(value.toString().replace(/[^0-9]/g, '')) || 0;
  return 'Rp ' + number.toLocaleString('id-ID');
}
function parseRupiah(value) {
  return parseInt(String(value).replace(/[^0-9]/g, '')) || 0;
}

// set today's date
(function setToday() {
  const d = new Date().toISOString().split('T')[0];
  const el = document.getElementById('transactionDate');
  if (el) el.value = d;
})();

// Load groups from API
async function loadFormGroups() {
  groupsContainer.innerHTML = 'Loading groups...';
  try {
    const res = await fetch(`${EXPENSE_API_URL}/groups/list?user_id=${CURRENT_USER_ID}`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch groups');
    const data = await res.json();
    renderGroups(data);
  } catch (err) {
    console.error(err);
    groupsContainer.innerHTML = '<div>Unable to load groups.</div>';
  }
}

function renderGroups(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    groupsContainer.innerHTML = '<div>No groups found.</div>';
    return;
  }
  groupsContainer.innerHTML = '';
  groups.forEach(g => {
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `group_${g.id}`;
    input.name = 'groups[]';
    input.value = g.id;
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = g.name;
    wrapper.appendChild(input);
    wrapper.appendChild(label);
    groupsContainer.appendChild(wrapper);
  });
}

// Category search
async function searchCategories(q = '') {
  try {
    const res = await fetch(`${EXPENSE_API_URL}/categories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: q, user_id: parseInt(CURRENT_USER_ID) })
    });
    if (!res.ok) throw new Error('Category search failed');
    const json = await res.json();
    categories = json.categories || [];
    renderDropdown(q);
  } catch (err) {
    console.error(err);
    categories = [];
    renderDropdown(q);
  }
}

function renderDropdown(filter = '') {
  dropdownList.innerHTML = '';
  const filtered = categories.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
  if (filtered.length === 0 && filter.trim() !== '') {
    const createItem = document.createElement('div');
    createItem.className = 'dropdown-item create-item';
    createItem.textContent = `+ Create "${filter}"`;
    createItem.addEventListener('click', () => selectCategory(filter, true));
    dropdownList.appendChild(createItem);
  } else {
    filtered.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = cat.name;
      item.addEventListener('click', () => selectCategory(cat.name, false));
      dropdownList.appendChild(item);
    });
  }
  dropdownList.style.display = 'block';
}

function selectCategory(name, isNew = false) {
  dropdownInput.value = name;
  hiddenCategoryInput.value = name;
  dropdownList.style.display = 'none';
  if (isNew) alert(`Category "${name}" will be created when you submit.`);
}

// Items / rows
function addItemRow() {
  const tbody = document.querySelector('#itemsTable tbody');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="item-name" name="items[${itemCounter}][name]" placeholder="Item name"></td>
    <td><input type="number" class="item-quantity" name="items[${itemCounter}][quantity]" step="0.01" placeholder="0"></td>
    <td><input type="text" class="item-price" name="items[${itemCounter}][price]" placeholder="Rp 0"></td>
    <td><button type="button" class="delete-btn" onclick="deleteRow(this)"><span class="material-icons-outlined">delete</span></button></td>
  `;
  tbody.appendChild(row);
  itemCounter++;
  row.querySelector('.item-quantity').addEventListener('input', calculateSubtotal);
  row.querySelector('.item-price').addEventListener('input', function () { this.value = formatRupiah(this.value); calculateSubtotal(); });
}

function deleteRow(btn) {
  const tbody = document.querySelector('#itemsTable tbody');
  if (tbody.querySelectorAll('tr').length > 1) {
    btn.closest('tr').remove();
    calculateSubtotal();
  } else {
    alert('At least one item is required!');
  }
}

// Calculations
function calculateSubtotal() {
  let subtotal = 0;
  document.querySelectorAll('#itemsTable tbody tr').forEach(row => {
    const q = parseFloat((row.querySelector('.item-quantity').value) || 0);
    const p = parseRupiah(row.querySelector('.item-price').value);
    subtotal += q * p;
  });
  subtotalInput.value = formatRupiah(subtotal);
  calculateTotal();
}
function calculateTotal() {
  const subtotal = parseRupiah(subtotalInput.value);
  const tax = parseRupiah(taxInput.value || 0);
  const service = parseRupiah(serviceInput.value || 0);
  const discount = parseRupiah(discountInput.value || 0);
  const total = subtotal + tax + service - discount;
  totalAmountEl.textContent = formatRupiah(total);
  grandTotalInput.value = String(total);
}

// Form submit -> POST to /expense/add
expenseForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  // convert inputs to numeric values where needed
  calculateSubtotal();

  const items = [];
  document.querySelectorAll('#itemsTable tbody tr').forEach(row => {
    const name = row.querySelector('.item-name').value || '';
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseRupiah(row.querySelector('.item-price').value);
    if (name && quantity > 0 && price > 0) items.push({ name, quantity, price });
  });

  const selectedGroups = Array.from(document.querySelectorAll('input[name="groups[]"]:checked')).map(i => parseInt(i.value));

  const payload = {
    user_id: parseInt(CURRENT_USER_ID),
    expense_name: document.getElementById('expenseName').value,
    transaction_date: document.getElementById('transactionDate').value,
    payment_method: document.getElementById('paymentMethod').value,
    category_name: hiddenCategoryInput.value || dropdownInput.value || null,
    subtotal: parseRupiah(subtotalInput.value),
    tax: parseRupiah(taxInput.value),
    service_charge: parseRupiah(serviceInput.value),
    discount: parseRupiah(discountInput.value),
    grand_total: parseInt(grandTotalInput.value) || 0,
    items,
    groups: selectedGroups
  };

  // Basic client validation
  if (!payload.expense_name || !payload.transaction_date) {
    alert('Please fill required fields');
    return;
  }

  try {
    const res = await fetch(`${EXPENSE_API_URL}/expense/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Server error');
    }
    const json = await res.json();
    if (json.success) {
      alert('Expense added successfully!'); // ← UBAH: Pakai browser alert
      expenseForm.reset();
      subtotalInput.value = 'Rp 0';
      totalAmountEl.textContent = 'Rp 0';
      grandTotalInput.value = '0';
      document.querySelector('.upload-text').textContent = "➕ Add Invoice"; // ← TAMBAH: Reset upload text
      // reload groups/categories if needed
      loadFormGroups();
    } else {
      alert(json.message || 'Failed to add expense'); // ← UBAH: Pakai browser alert
    }
  } catch (err) {
    console.error(err);
    alert('Error: ' + (err.message || 'Unknown'));
  }
});

// function showAlert(type, text) {
//   const alerts = document.getElementById('alerts');
//   alerts.innerHTML = `<div class="alert ${type === 'success' ? 'alert-success' : 'alert-error'}">${text}</div>`;
//   setTimeout(() => { if (alerts.firstChild) alerts.removeChild(alerts.firstChild); }, 5000);
// }

// Event listeners set-up
document.addEventListener('DOMContentLoaded', function () {
  loadFormGroups();
  // initial formatting for price inputs
  document.querySelectorAll('.item-price').forEach(i => i.addEventListener('input', function () { this.value = formatRupiah(this.value); calculateSubtotal(); }));
  document.querySelectorAll('.item-quantity').forEach(i => i.addEventListener('input', calculateSubtotal));
  [taxInput, serviceInput, discountInput].forEach(inp => {
    inp.addEventListener('input', function () { this.value = formatRupiah(this.value); calculateTotal(); });
  });

  // dropdown category listeners
  dropdownInput.addEventListener('focus', () => searchCategories(dropdownInput.value));
  dropdownInput.addEventListener('input', () => searchCategories(dropdownInput.value));
  document.addEventListener('click', e => { if (!e.target.closest('.dropdown-container')) dropdownList.style.display = 'none'; });
});










// Listener saat user memilih gambar struk
invoiceInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Ubah teks agar user tahu sedang proses
    document.querySelector('.upload-text').textContent = "⏳ Uploading & Scanning...";

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async function() {
        const base64String = reader.result; 

        try {
            // 1. Upload ke S3 via API Gateway
            const uploadRes = await fetch(`${EXPENSE_API_URL}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64String, filename: file.name })
            });
            
            const uploadData = await uploadRes.json();
            if (!uploadData.success) throw new Error("Upload failed");

            // 2. Polling: Tanya ke API apakah hasil scan sudah siap
            // Nama file hasil diprediksi berdasarkan nama file upload
            const resultKey = uploadData.key.replace('inbox/', 'outbox/') + ".json";
            pollScanResult(resultKey);

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
            document.querySelector('.upload-text').textContent = "➕ Add Invoice";
        }
    };
});

// Fungsi Polling ke API Gateway
async function pollScanResult(key, attempts = 0) {
    if (attempts > 15) { // Timeout setelah 15 detik
        alert("Scan timeout. Silakan isi manual.");
        document.querySelector('.upload-text').textContent = "➕ Add Invoice";
        return;
    }

    try {
        // Panggil endpoint baru kita
        const res = await fetch(`${EXPENSE_API_URL}/upload/check-scan?key=${key}`);
        
        if (res.status === 200) {
            const data = await res.json();
            
            // === AUTOFILL FORM ===
            // 1. Isi Vendor & Total
            if(data.vendor) document.getElementById('expenseName').value = data.vendor;
            if(data.total) document.getElementById('grandTotalInput').value = data.total;
            
            // 2. Isi Tanggal (Jika format cocok, kalau tidak biarkan hari ini)
            // Textract kadang return '01-NOV-2025', input date butuh '2025-11-01'
            // Anda bisa tambah logic parsing tanggal di sini jika perlu.

            // 3. Isi Tabel Items
            if (data.items && data.items.length > 0) {
                // Kosongkan tabel lama dulu (kecuali header)
                const tbody = document.querySelector('#itemsTable tbody');
                tbody.innerHTML = ''; 
                itemCounter = 0; // Reset counter

                // Loop item dari hasil scan
                data.items.forEach(item => {
                    addItemRow(); // Buat baris baru
                    
                    // Ambil baris terakhir yang baru dibuat
                    const lastRow = tbody.lastElementChild;
                    
                    // Isi inputannya
                    lastRow.querySelector('.item-name').value = item.name;
                    lastRow.querySelector('.item-quantity').value = item.qty;
                    // Format harga ke Rupiah
                    lastRow.querySelector('.item-price').value = formatRupiah(item.price);
                });

                // === AUTOFILL TAX / SERVICE / DISCOUNT ===
                if (data.tax !== undefined) {
                    taxInput.value = formatRupiah(data.tax);
                }
                if (data.service !== undefined) {
                    serviceInput.value = formatRupiah(data.service);
                }
                if (data.discount !== undefined) {
                    discountInput.value = formatRupiah(data.discount);
                }
                
                // Hitung ulang subtotal
                calculateSubtotal();
            }

            alert("Struk berhasil dibaca! Silakan cek dan koreksi datanya.");
            document.querySelector('.upload-text').textContent = "✅ Scanned";

        } else {
            // Jika 404/Processing, coba lagi 1 detik kemudian
            setTimeout(() => pollScanResult(key, attempts + 1), 1000);
        }
    } catch (e) {
        console.error(e);
        setTimeout(() => pollScanResult(key, attempts + 1), 1000);
    }
}