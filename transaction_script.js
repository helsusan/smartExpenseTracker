// transaction_script.js
// Frontend logic: fetch transactions from Lambda API and populate DataTable
// IMPORTANT: change API_BASE to your API Gateway base URL (no trailing slash)
const API_BASE = "https://{API_ID}.execute-api.{REGION}.amazonaws.com/prod"; // <-- EDIT THIS
const HARD_CODED_USER_ID = 3; // matches original behavior where user is hardcoded for testing

document.addEventListener('DOMContentLoaded', () => {
     const USER_ID = localStorage.getItem("user_id");
   const USER_NAME = localStorage.getItem("user_name");
   
   if (!USER_ID) {
       // Redirect ke login jika diperlukan
       // window.location.href = 'index.html'; 
       console.error("User ID not found. Please login.");
   } else {
       const welcomeText = document.getElementById('welcomeText');
       if (welcomeText) {
           welcomeText.textContent = `Welcome, ${USER_NAME || 'User'}!`;
       }
   }
   

  // Load sidebar (optional) - if you exported sidebar.html to S3, we can fetch it
  fetchSidebar();

  // Initialize date range from URL params or default (first day of this month to today)
  const urlParams = new URLSearchParams(window.location.search);
  const startParam = urlParams.get('start_date');
  const endParam = urlParams.get('end_date');
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultStart = startParam || formatDateISO(firstDay);
  const defaultEnd = endParam || formatDateISO(today);

  // Flatpickr range
  const fp = flatpickr("#dateRange", {
    mode: "range",
    dateFormat: "Y-m-d",
    defaultDate: [defaultStart, defaultEnd],
    onReady: selectedDates => updateDisplayedRange(selectedDates),
    onChange: selectedDates => {
      if (selectedDates.length === 2) {
        const s = formatDateISO(selectedDates[0]);
        const e = formatDateISO(selectedDates[1]);
        updateDisplayedRange(selectedDates);
        // reload with new params (so backend can filter)
        window.location = `?start_date=${s}&end_date=${e}`;
      }
    }
  });

  // Buttons
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

  // Fetch transactions from API and populate
  const start_date = defaultStart;
  const end_date = defaultEnd;

  fetchTransactions(HARD_CODED_USER_ID, start_date, end_date)
    .then(rows => populateTable(rows))
    .catch(err => {
      console.error(err);
      document.getElementById('transactionsBody').innerHTML = `<tr><td colspan="8" class="p-4 text-red-500">Failed to load transactions</td></tr>`;
    });

  // DataTable will be created inside populateTable
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
        <td class="py-2 px-4">${escapeHtml(r.group || '-')}</td>
      `;
      tbody.appendChild(tr);
    });

    // Init DataTable
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

  // Helpers
  function formatItemsTable(items) {
    let html = `<table class="ml-6 my-2 border border-gray-300 rounded-md w-11/12 text-sm"><thead><tr class="border-b border-gray-300">
      <th class="p-2 text-left font-semibold">Item Name</th>
      <th class="p-2 text-left font-semibold">Quantity</th>
      <th class="p-2 text-left font-semibold">Unit Price</th>
      <th class="p-2 text-left font-semibold">Subtotal</th>
    </tr></thead><tbody>`;
    items.forEach(it => {
      html += `<tr class="border-b border-gray-200">
        <td class="p-2">${escapeHtml(it.item_name)}</td>
        <td class="p-2">${escapeHtml(it.quantity)}</td>
        <td class="p-2">Rp ${Number(it.unit_price).toLocaleString()}</td>
        <td class="p-2 text-right font-medium">Rp ${Number(it.subtotal).toLocaleString()}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    return html;
  }

  function fetchTransactions(user_id, start_date, end_date) {
    const url = `${API_BASE}/transactions?user_id=${user_id}&start_date=${start_date}&end_date=${end_date}`;
    return fetch(url).then(r => {
      if (!r.ok) throw new Error('Failed to fetch transactions');
      return r.json();
    });
  }

  function formatDateISO(d) {
    if (!d) d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function formatDateDisplay(s) {
    if (!s) return '-';
    const d = new Date(s);
    const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  function formatCurrency(v) {
    return `Rp${Number(v).toLocaleString('id-ID')}`;
  }
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (s) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]);
    });
  }

  function updateDisplayedRange(dates) {
    if (!dates || dates.length < 2) return;
    const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const s = dates[0], e = dates[1];
    document.getElementById('dateRange').value = `${s.getDate()} ${months[s.getMonth()]} ${s.getFullYear()} - ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
  }

  // Optionally load sidebar HTML from S3 (if you created sidebar.html)
  function fetchSidebar() {
    // If you uploaded sidebar.html to S3, change path below accordingly.
    fetch('sidebar.html').then(r => {
      if (!r.ok) throw new Error('no sidebar');
      return r.text();
    }).then(html => {
      document.getElementById('sidebar-placeholder').innerHTML = html;
    }).catch(() => { /* ignore if sidebar not present */ });
  }

});
