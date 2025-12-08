// transaction_script.js (FINAL FIXED VERSION)

// IMPORTANT: your API Gateway base URL
const API_BASE = "https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod";

document.addEventListener('DOMContentLoaded', () => {

  // --- Load USER_ID from URL or localStorage ---
  const urlParams = new URLSearchParams(window.location.search);
  const urlUserId = urlParams.get("user_id");

  let USER_ID = urlUserId || localStorage.getItem("user_id");
  let USER_NAME = localStorage.getItem("user_name");

  if (!USER_ID) {
      console.error("User ID not found. Please login.");
      // window.location.href = "index.html";
      return;
  }

  // Save back to localStorage if needed
  localStorage.setItem("user_id", USER_ID);

  if (document.getElementById('welcomeText')) {
      document.getElementById('welcomeText').textContent = `Welcome, ${USER_NAME || 'User'}!`;
  }

  // --- Load sidebar ---
  fetchSidebar();

  // --- Handle default date range ---
  const startParam = urlParams.get('start_date');
  const endParam = urlParams.get('end_date');

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultStart = startParam || formatDateISO(firstDay);
  const defaultEnd = endParam || formatDateISO(today);

  // Initialize Flatpickr
  const fp = flatpickr("#dateRange", {
    mode: "range",
    dateFormat: "Y-m-d",
    defaultDate: [defaultStart, defaultEnd],
    onReady: (selectedDates) => updateDisplayedRange(selectedDates),
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) {
        const s = formatDateISO(selectedDates[0]);
        const e = formatDateISO(selectedDates[1]);

        updateDisplayedRange(selectedDates);

        // --- FIXED: redirect with USER_ID included ---
        window.location.href = `transaction.html?user_id=${USER_ID}&start_date=${s}&end_date=${e}`;
      }
    }
  });

  // Button filter
  const buttons = {
    all: document.getElementById('btnAll'),
    income: document.getElementById('btnIncome'),
    expense: document.getElementById('btnExpense'),
  };

  let selectedType = "All";

  function setActiveButton(activeBtn) {
    Object.values(buttons).forEach(b => b.classList.remove('btn-active'));
    activeBtn.classList.add('btn-active');
  }

  buttons.all.addEventListener('click', () => { selectedType = "All"; setActiveButton(buttons.all); table.draw(); });
  buttons.income.addEventListener('click', () => { selectedType = "Income"; setActiveButton(buttons.income); table.draw(); });
  buttons.expense.addEventListener('click', () => { selectedType = "Expense"; setActiveButton(buttons.expense); table.draw(); });

  // Fetch transaction data
  fetchTransactions(USER_ID, defaultStart, defaultEnd)
    .then(rows => populateTable(rows))
    .catch(err => {
      console.error(err);
      document.getElementById('transactionsBody').innerHTML =
        `<tr><td colspan="8" class="p-4 text-red-500">Failed to load transactions</td></tr>`;
    });

  let table = null;

  function populateTable(rows) {
    const tbody = document.getElementById('transactionsBody');
    tbody.innerHTML = '';

    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.dataset.id = r.id;
      tr.className = 'border-b hover:bg-gray-50';
      tr.innerHTML = `
        <td class="details-control"></td>
        <td class="py-2 px-4">${formatDateDisplay(r.date)}</td>
        <td class="py-2 px-4">${escapeHtml(r.type)}</td>
        <td class="py-2 px-4">${escapeHtml(r.name)}</td>
        <td class="py-2 px-4">${formatCurrency(r.amount)}</td>
        <td class="py-2 px-4">${escapeHtml(r.payment_method || '-')}</td>
        <td class="py-2 px-4">${escapeHtml(r.category || '-')}</td>
        <td class="py-2 px-4">${escapeHtml(r.group_name || '-')}</td>
      `;
      tbody.appendChild(tr);
    });

    // Initialize DataTable
    table = $('#transactionTable').DataTable({
      pageLength: 10,
      lengthChange: true,
      order: [[1, "desc"]],
      language: { infoFiltered: "" }
    });

    // Custom filter
    $.fn.dataTable.ext.search.push((settings, data) => {
      const type = data[2];
      if (selectedType !== "All" && type !== selectedType) return false;
      return true;
    });

    // Child row behavior
    $('#transactionTable tbody').on('click', 'td.details-control', function () {
      const tr = $(this).closest('tr');
      const row = table.row(tr);
      const transactionId = tr.data('id');

      if (row.child.isShown()) {
        row.child.hide();
        tr.removeClass('shown');
      } else {
        fetch(`${API_BASE}/transaction_items?id=${transactionId}`)
          .then(res => res.json())
          .then(items => {
            if (!Array.isArray(items) || items.length === 0) {
              row.child('<div class="ml-6 text-gray-500 text-sm">No items found</div>').show();
              tr.addClass('shown');
              return;
            }
            row.child(formatItemsTable(items)).show();
            tr.addClass('shown');
          })
          .catch(() => {
            row.child('<div class="ml-6 text-red-500 text-sm">Error loading items</div>').show();
            tr.addClass('shown');
          });
      }
    });
  }

  // API call
  function fetchTransactions(user_id, start_date, end_date) {
    const url = `${API_BASE}/transactions?user_id=${user_id}&start_date=${start_date}&end_date=${end_date}`;
    return fetch(url).then(r => {
      if (!r.ok) throw new Error('Failed to fetch transactions');
      return r.json();
    });
  }

  // Helper functions
  function formatItemsTable(items) {
    let html = `
      <table class="ml-6 my-2 border border-gray-300 rounded-md w-11/12 text-sm">
        <thead>
          <tr class="border-b border-gray-300">
            <th class="p-2 text-left font-semibold">Item Name</th>
            <th class="p-2 text-left font-semibold">Quantity</th>
            <th class="p-2 text-left font-semibold">Unit Price</th>
            <th class="p-2 text-left font-semibold">Subtotal</th>
          </tr>
        </thead><tbody>
    `;

    items.forEach(it => {
      html += `
        <tr class="border-b border-gray-200">
          <td class="p-2">${escapeHtml(it.item_name)}</td>
          <td class="p-2">${escapeHtml(it.quantity)}</td>
          <td class="p-2">Rp ${Number(it.unit_price).toLocaleString()}</td>
          <td class="p-2 text-right font-medium">Rp ${Number(it.subtotal).toLocaleString()}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  function formatDateISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDateDisplay(s) {
    if (!s) return '-';
    const d = new Date(s);
    const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatCurrency(v) {
    return `Rp${Number(v).toLocaleString("id-ID")}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, (s) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])
    );
  }

  function updateDisplayedRange(dates) {
    if (!dates || dates.length < 2) return;
    const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const s = dates[0], e = dates[1];
    document.getElementById('dateRange').value =
      `${s.getDate()} ${months[s.getMonth()]} ${s.getFullYear()} - ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
  }

  function fetchSidebar() {
    fetch("sidebar.html")
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(html => {
        document.getElementById("sidebar-placeholder").innerHTML = html;
      })
      .catch(() => {});
  }

});
