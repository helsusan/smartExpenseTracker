/* FILE: expense_script.js
   CHANGED: Replaced PHP AJAX with REST API calls to Lambda (via API Gateway).
   IMPORTANT: Set API_BASE_URL to your API Gateway base URL (no trailing slash).
*/

const API_BASE_URL = 'https://REPLACE_WITH_YOUR_API.execute-api.ap-southeast-1.amazonaws.com/prod';
const HARDCODED_USER_ID = 3; // CHANGED: frontend supplies user_id (in production use proper auth)

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
async function loadGroups() {
  groupsContainer.innerHTML = 'Loading groups...';
  try {
    const res = await fetch(`${API_BASE_URL}/groups/list?user_id=${HARDCODED_USER_ID}`, { method: 'GET' });
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
    const res = await fetch(`${API_BASE_URL}/categories/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: q, user_id: HARDCODED_USER_ID })
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
    user_id: HARDCODED_USER_ID,
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
    const res = await fetch(`${API_BASE_URL}/expense/add`, {
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
      showAlert('success', 'Expense added successfully!');
      expenseForm.reset();
      subtotalInput.value = 'Rp 0';
      totalAmountEl.textContent = 'Rp 0';
      grandTotalInput.value = '0';
      // reload groups/categories if needed
      loadGroups();
    } else {
      showAlert('error', json.message || 'Failed to add expense');
    }
  } catch (err) {
    console.error(err);
    showAlert('error', 'Error: ' + (err.message || 'Unknown'));
  }
});

function showAlert(type, text) {
  const alerts = document.getElementById('alerts');
  alerts.innerHTML = `<div class="alert ${type === 'success' ? 'alert-success' : 'alert-error'}">${text}</div>`;
  setTimeout(() => { if (alerts.firstChild) alerts.removeChild(alerts.firstChild); }, 5000);
}

// Event listeners set-up
document.addEventListener('DOMContentLoaded', function () {
  loadGroups();
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
