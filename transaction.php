<?php
session_start();
require 'db_config.php';

// sementara untuk testing
$_SESSION['user_id'] = 3;
$_SESSION['user_name'] = 'Aiko';
$_SESSION['user_email'] = 'c14220072@john.petra.ac.id';

$user_id = $_SESSION['user_id'];

// Ambil transaksi user
$query = $db->prepare("
    SELECT 
        t.id, t.date, t.type, t.name, t.amount, t.payment_method, 
        c.name AS category, g.name AS `group`
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN transaction_groups tg ON t.id = tg.transaction_id
    LEFT JOIN `groups` g ON tg.group_id = g.id
    WHERE t.user_id = :user_id
    ORDER BY t.date DESC
");
$query->execute(['user_id' => $user_id]);
$transactions = $query->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction</title>

  <!-- Tailwind -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Font -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- Flatpickr -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>

  <!-- DataTables -->
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.tailwindcss.min.css">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>

  <style>
    body {
      font-family: 'Poppins', sans-serif;
      background-color: #FDFBEE;
    }
    .btn-filter {
      border: 1.5px solid #063D35;
      color: #063D35;
      border-radius: 9999px;
      padding: 5px 16px;
      font-size: 0.9rem;
      font-weight: 500;
      background-color: white;
      transition: all 0.2s ease-in-out;
    }
    .btn-filter:hover {
      background-color: #063D35;
      color: white;
    }
    .btn-active {
      background-color: #063D35;
      color: white !important;
    }
    .btn-add {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1.5px solid #063D35;
      color: #063D35;
      border-radius: 9999px;
      padding: 5px 16px;
      font-size: 0.9rem;
      font-weight: 600;
      background-color: white;
      transition: all 0.2s ease-in-out;
    }
    .btn-add:hover {
      background-color: #063D35;
      color: white;
    }
    .calendar-input {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1.5px solid #063D35;
      border-radius: 9999px;
      padding: 6px 12px;
      background-color: #063D35;
      color: white;
      font-size: 0.9rem;
      cursor: pointer;
      min-width: 240px;
    }
    .calendar-input svg {
      width: 16px;
      height: 16px;
    }

    /* === Table Rounded & Color Styling === */
    .table-container {
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Header table */
    #transactionTable thead tr {
      background-color: #063D35;
      color: white;
    }

    /* Isi tabel */
    /*#transactionTable tbody tr:nth-child(odd) {
      background-color: #fbf7eaff;
      color: #063D35;
    }

    #transactionTable tbody tr:nth-child(even) {
      background-color: #063D35;
      color: #FAF9F5;
    } */

    /* Hover effect */
    /*#transactionTable tbody tr:nth-child(odd):hover {
      background-color: #f7f4efff; !important;
      color: #115e52;
    }

    #transactionTable tbody tr:nth-child(even):hover {
      background-color: #115e52 !important;
      color: white;
    }/*


    /* Table layout & spacing */
    #transactionTable {
      width: 100%;
      border-collapse: collapse;
    }

    #transactionTable th,
    #transactionTable td {
      padding: 12px 16px;
      text-align: left;
    }

    #transactionTable th:first-child {
      border-top-left-radius: 16px;
    }

    #transactionTable th:last-child {
      border-top-right-radius: 16px;
    }


    /* === Styling Search Box & Pagination === */

    /* Kotak search */
    .dataTables_filter {
      margin-bottom: 12px;
    }

    .dataTables_filter label {
      font-size: 12px;
      color: #063D35;
      font-weight: 500;
    }

    .dataTables_filter input {
      border: 1px solid #ccc;
      border-radius: 12px;
      padding: 6px 10px;
      font-size: 12px;
      outline: none;
      transition: all 0.2s ease;
    }

    .dataTables_filter input:focus {
      border-color: #063D35;
      box-shadow: 0 0 4px rgba(6, 61, 53, 0.3);
    }

    /* Text "Showing 1 to 3 of 3 entries" */
    .dataTables_info {
      font-size: 12px;
      color: #063D35;
      margin-top: 8px;
    }


    /* Pagination */
    .dataTables_paginate {
      font-size: 12px;
      margin-top: 8px;
    }

    /* Tombol pagination (Previous, Next, nomor halaman) */
    .dataTables_paginate .paginate_button,
    .dataTables_paginate .paginate_button a {
      border: 1px solid #ccc !important;
      border-radius: 8px !important;
      padding: 3px 8px !important;
      margin: 0 2px !important;
      background-color: #FFFFFF !important;
      transition: all 0.2s ease;
      text-decoration: none !important;
    }

    /* Hover */
    .dataTables_paginate .paginate_button:hover,
    .dataTables_paginate .paginate_button a:hover {
      /* background-color: #063D35 !important; */
      /* color: #FFFFFF !important; Warna teks saat hover */
      border-color: #063D35 !important;
    }

    /* Halaman aktif */
    .dataTables_paginate .paginate_button.current,
    .dataTables_paginate .paginate_button.current:hover {
      /* background-color: #063D35 !important; */
      /* color: #FFFFFF !important; */
      border-color: #063D35 !important;
    }

    /* Override style bawaan DataTables untuk tabel di dalam row child */
table.dataTable tr td > table {
  border: 1px solid #ccc !important;
  border-radius: 8px !important;
  background: white !important;
  width: 95% !important;
  margin: 8px auto !important;
}

table.dataTable tr td > table thead tr {
  background: none !important;
  color: #000 !important;
  border-bottom: 1px solid #ccc !important;
}

table.dataTable tr td > table th,
table.dataTable tr td > table td {
  background: none !important;
  color: #000 !important;
  border: none !important;
  padding: 6px 10px !important;
  text-align: left !important;
  font-weight: 500 !important;
}


    /* Row Child */
    .details-control {
      cursor: pointer;
      text-align: center;
      color: #063D35;
      font-weight: bold;
    }
    .details-control::before {
      content: '+';
      font-size: 18px;
    }
    tr.shown .details-control::before {
      content: '-';
    }

  </style>
</head>

<body class="min-h-screen p-10">

  <!-- Filter Section -->
  <div class="flex flex-wrap justify-between items-center mb-6">
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Calendar -->
      <div id="dateContainer" class="calendar-input">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <input id="dateRange" class="bg-transparent focus:outline-none cursor-pointer w-full" readonly>
      </div>

      <!-- Buttons -->
      <button id="btnAll" class="btn-filter btn-active">All</button>
      <button id="btnIncome" class="btn-filter">Income</button>
      <button id="btnExpense" class="btn-filter">Expense</button>
    </div>

    <!-- Add Button -->
    <button class="btn-add">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add
    </button>
  </div>

  <!-- Transaction Table -->
  <div class="bg-white rounded-xl shadow-md p-4">
    <h2 class="font-semibold text-lg mb-3">Transaction</h2>
    <div class="overflow-x-auto">
      <table id="transactionTable" class="table-container w-full text-sm text-left border-t border-gray-100">
        <thead>
          <tr class="border-b bg-[#063D35] text-white">
            <th></th>
            <th class="py-3 px-4">Date</th>
            <th class="py-3 px-4">Type</th>
            <th class="py-3 px-4">Name</th>
            <th class="py-3 px-4">Amount</th>
            <th class="py-3 px-4">Payment Method</th>
            <th class="py-3 px-4">Category</th>
            <th class="py-3 px-4">Group</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($transactions as $t): ?>
            <tr data-id="<?= $t['id'] ?>" class="border-b hover:bg-gray-50">
              <td class="details-control"></td>
              <td class="py-2 px-4"><?= date('j M Y', strtotime($t['date'])) ?></td>
              <td class="py-2 px-4"><?= htmlspecialchars($t['type']) ?></td>
              <td class="py-2 px-4"><?= htmlspecialchars($t['name']) ?></td>
              <td class="py-2 px-4"><?= number_format($t['amount'], 2) ?></td>
              <td class="py-2 px-4"><?= htmlspecialchars($t['payment_method']) ?></td>
              <td class="py-2 px-4"><?= htmlspecialchars($t['category'] ?? '-') ?></td>
              <td class="py-2 px-4"><?= htmlspecialchars($t['group'] ?? '-') ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

<script>
  // === FLATPICKR (default bulan ini) ===
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let startDate = start;
  let endDate = end;
  let selectedType = "All"; // filter tipe transaksi

  flatpickr("#dateRange", {
    mode: "range",
    dateFormat: "j M Y",
    defaultDate: [start, end],
    onReady: function(selectedDates, dateStr, instance) {
      instance.input.value = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    },
    onChange: function(selectedDates, dateStr, instance) {
      if (selectedDates.length === 2) {
        startDate = selectedDates[0];
        endDate = selectedDates[1];
        instance.input.value = `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        table.draw();
      }
    }
  });

  // === DATATABLE ===
  // === DataTables initialization ===
  const table = $('#transactionTable').DataTable({
    pageLength: 5,
    lengthChange: false,
    order: [[1, "desc"]],
    language: { infoFiltered: "" }
  });

  // === Function to format child row (tanpa warna header) ===
  function format(items) {
    let html = `
      <table class="ml-6 my-2 border border-gray-300 rounded-md w-11/12 text-sm">
        <thead>
          <tr class="border-b border-gray-300">
            <th class="p-2 text-left font-semibold">Item Name</th>
            <th class="p-2 text-left font-semibold">Quantity</th>
            <th class="p-2 text-left font-semibold">Unit Price</th>
            <th class="p-2 text-left font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody>`;
    items.forEach(item => {
      html += `
        <tr class="border-b border-gray-200">
          <td class="p-2">${item.item_name}</td>
          <td class="p-2">${item.quantity}</td>
          <td class="p-2">Rp ${parseFloat(item.unit_price).toLocaleString()}</td>
          <td class="p-2 text-right font-medium">Rp ${parseFloat(item.subtotal).toLocaleString()}</td>
        </tr>`;
    });
    html += `</tbody></table>`;
    return html;
  }

  // === Expand/Collapse row ===
  $('#transactionTable tbody').on('click', 'td.details-control', function() {
    const tr = $(this).closest('tr');
    const row = table.row(tr);
    const transactionId = tr.data('id');

    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass('shown');
    } else {
      $.ajax({
        url: 'transaction_items_fetch.php',
        method: 'GET',
        data: { id: transactionId },
        dataType: 'json',
        success: function(items) {
          if (items.length > 0) {
            row.child(format(items)).show();
            tr.addClass('shown');
          } else {
            row.child('<div class="ml-6 text-gray-500 text-sm">No items found</div>').show();
            tr.addClass('shown');
          }
        },
        error: function() {
          row.child('<div class="ml-6 text-red-500 text-sm">Error loading items</div>').show();
          tr.addClass('shown');
        }
      });
    }
  });

  // === FILTER TANGGAL + TYPE ===
  $.fn.dataTable.ext.search.push(function(settings, data) {
    const dateStr = data[0]; // kolom tanggal
    const type = data[1];    // kolom type
    const date = new Date(dateStr);

    // --- Filter tanggal ---
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (date < start || date > end) return false;
    }

    // --- Filter type (tanpa searchbox) ---
    if (selectedType !== "All" && type !== selectedType) return false;

    return true;
  });

  table.draw();

  // === FILTER BUTTON TYPE ===
  const buttons = {
    all: document.getElementById('btnAll'),
    income: document.getElementById('btnIncome'),
    expense: document.getElementById('btnExpense'),
  };

  function setActiveButton(activeBtn) {
    Object.values(buttons).forEach(btn => btn.classList.remove('btn-active'));
    activeBtn.classList.add('btn-active');
  }

  buttons.all.addEventListener('click', () => {
    selectedType = "All";
    setActiveButton(buttons.all);
    table.draw();
  });

  buttons.income.addEventListener('click', () => {
    selectedType = "Income";
    setActiveButton(buttons.income);
    table.draw();
  });

  buttons.expense.addEventListener('click', () => {
    selectedType = "Expense";
    setActiveButton(buttons.expense);
    table.draw();
  });
</script>


</body>
</html>
