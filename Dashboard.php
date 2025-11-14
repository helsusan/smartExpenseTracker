<?php
session_start();
require 'db_config.php';

// sementara untuk testing
$_SESSION['user_id'] = 3;
$_SESSION['user_name'] = 'Aiko';
$_SESSION['user_email'] = 'c14220072@john.petra.ac.id';

$user_id = $_SESSION['user_id'];

// Ambil bulan dan tahun dari parameter GET, default bulan & tahun sekarang
$selected_month = isset($_GET['month']) ? (int) $_GET['month'] : date('n');
$selected_year = isset($_GET['year']) ? (int) $_GET['year'] : date('Y');

// === Ambil total income (filter bulan dan tahun) ===
$query_income = $db->prepare("
    SELECT SUM(amount) AS total_income 
    FROM transactions 
    WHERE user_id = :user_id 
      AND type = 'Income' 
      AND MONTH(date) = :month 
      AND YEAR(date) = :year
");
$query_income->execute([
  ':user_id' => $user_id,
  ':month' => $selected_month,
  ':year' => $selected_year
]);
$total_income = $query_income->fetch(PDO::FETCH_ASSOC)['total_income'] ?? 0;

// === Ambil total expense (filter bulan dan tahun) ===
$query_expense = $db->prepare("
    SELECT SUM(amount) AS total_expense 
    FROM transactions 
    WHERE user_id = :user_id 
      AND type = 'Expense'
      AND MONTH(date) = :month 
      AND YEAR(date) = :year
");
$query_expense->execute([
  ':user_id' => $user_id,
  ':month' => $selected_month,
  ':year' => $selected_year
]);
$total_expense = $query_expense->fetch(PDO::FETCH_ASSOC)['total_expense'] ?? 0;

// === Hitung balance ===
$balance = $total_income - $total_expense;

// === Ambil budget user ===
$query_budget = $db->prepare("SELECT budget FROM users WHERE id = :user_id");
$query_budget->execute([':user_id' => $user_id]);
$budget = $query_budget->fetch(PDO::FETCH_ASSOC)['budget'] ?? 15000000;

$remaining = $budget - $total_expense;
$percentage_used = $budget > 0 ? ($total_expense / $budget) * 100 : 0;

// === Pie Chart: Expense by Category ===
$query_category = $db->prepare("
    SELECT c.name AS category_name, SUM(t.amount) AS total_expense
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = :user_id 
      AND t.type = 'Expense'
      AND MONTH(t.date) = :month 
      AND YEAR(t.date) = :year
    GROUP BY c.name
");
$query_category->execute([
  ':user_id' => $user_id,
  ':month' => $selected_month,
  ':year' => $selected_year
]);
$category_data = $query_category->fetchAll(PDO::FETCH_ASSOC);

$categories = [];
$category_amounts = [];
foreach ($category_data as $row) {
  $categories[] = $row['category_name'];
  $category_amounts[] = (float) $row['total_expense'];
}

// === Daily Expense Chart ===
$query_daily = $db->prepare("
    SELECT DATE(date) AS day, SUM(amount) AS total
    FROM transactions
    WHERE user_id = :user_id 
      AND type = 'Expense'
      AND MONTH(date) = :month 
      AND YEAR(date) = :year
    GROUP BY DATE(date)
    ORDER BY day ASC
");
$query_daily->execute([
  ':user_id' => $user_id,
  ':month' => $selected_month,
  ':year' => $selected_year
]);
$daily_data = $query_daily->fetchAll(PDO::FETCH_ASSOC);

$dates = [];
$daily_expenses = [];
foreach ($daily_data as $row) {
  $dates[] = $row['day'];
  $daily_expenses[] = (float) $row['total'];
}

// === Money Flow (berdasarkan tahun saja) ===
$query_monthly = $db->prepare("
    SELECT 
        MONTH(date) AS month_num,
        DATE_FORMAT(date, '%b') AS month,
        SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) AS total_expense
    FROM transactions
    WHERE user_id = :user_id AND YEAR(date) = :year
    GROUP BY MONTH(date), DATE_FORMAT(date, '%b')
    ORDER BY MONTH(date)
");
$query_monthly->execute([
  ':user_id' => $user_id,
  ':year' => $selected_year
]);
$monthly_data = $query_monthly->fetchAll(PDO::FETCH_ASSOC);

$months = [];
$monthly_income = [];
$monthly_expense = [];
foreach ($monthly_data as $row) {
  $months[] = $row['month'];
  $monthly_income[] = (float) $row['total_income'];
  $monthly_expense[] = (float) $row['total_expense'];
}
?>

<!DOCTYPE html>
<html lang="id">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>

  <link rel="icon" href="data:,">

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/monthSelect/index.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/monthSelect/style.css">

  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <link rel="stylesheet" href="sidebar_group_style.css">
  

  <style>
    body {
      font-family: 'Poppins', sans-serif;
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

    .icon-center {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px; 
  color: white;
}
.icon-balance {
  color: #0A514B; /* warna hijau tua untuk icon di lingkaran putih */
}


.navbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: var(--nav-bg);
            color: var(--nav-text);
            padding: 16px 5%;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .navbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #hamburger-btn {
            background: transparent;
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
        }

        #hamburger-btn .material-icons-outlined {
            font-size: 26px;
        }

  </style>
</head>

<body>

<header class="navbar">
    <div class="navbar-left">
        <button id="hamburger-btn" aria-label="Toggle Sidebar">
            <span class="material-icons-outlined">menu</span>
        </button>
        <h1>Welcome, <?php echo htmlspecialchars($_SESSION['user_name']); ?>!</h1>
    </div>

    <div class="navbar-right">
        <a href="dashboard.php" class="nav-link">
            <span class="material-icons-outlined">dashboard</span>
            <span>Dashboard</span>
        </a>
        
        <a href="transaction.php" class="nav-link">
            <span class="material-icons-outlined">receipt_long</span>
            <span>Transaction</span>
        </a>
    </div>
</header>

<?php include 'sidebar.php'; ?>
<div id="sidebar-overlay" class="sidebar-overlay"></div>

<div class="bg-[#FDFBEE] min-h-screen p-10">
  <!-- Filter Bulan & Tahun -->
  <div class="flex justify-start mb-6">
    <div id="monthPicker" class="calendar-input">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <input id="datePickerInput" type="text" readonly class="bg-transparent w-full focus:outline-none cursor-pointer">
    </div>
  </div>

  <!-- Container Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    <!-- Income -->
    <div
      class="flex items-center gap-4 bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div class="w-12 h-12 bg-[#0A514B] rounded-full flex-shrink-0 flex items-center justify-center">
        <span class="material-symbols-outlined icon-center">attach_money</span>
      </div>
      <div>
        <p class="font-semibold text-gray-900 text-lg">
          <?= 'Rp' . number_format($total_income, 0, ',', '.') ?>
        </p>
        <p class="text-sm text-gray-500">Income</p>
      </div>
    </div>

    <!-- Expense -->
    <div
      class="flex items-center gap-4 bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
      <div class="w-12 h-12 bg-[#0A514B] rounded-full flex-shrink-0 flex items-center justify-center">
        <span class="material-symbols-outlined icon-center">money_off</span>
      </div>
      <div>
        <p class="font-semibold text-gray-900 text-lg">
          <?= 'Rp' . number_format($total_expense, 0, ',', '.') ?>
        </p>
        <p class="text-sm text-gray-500">Expense</p>
      </div>
    </div>

    <!-- Balance -->
    <div
      class="flex items-center gap-4 bg-[#0A514B] rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 text-white">
      <div class="w-12 h-12 bg-[#FFFFFF] rounded-full flex-shrink-0 flex items-center justify-center">
        <span class="material-symbols-outlined icon-center icon-balance">savings</span>
      </div>
      <div>
        <p class="font-semibold text-lg">
          <?= 'Rp' . number_format($balance, 0, ',', '.') ?>
        </p>
        <p class="text-sm text-white/90">Balance</p>
      </div>
    </div>
  </div>

  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Pie Chart -->
    <div class="bg-white rounded-xl shadow-md p-6 flex flex-col justify-center items-center">
      <h2 class="font-semibold text-gray-800 mb-2 text-center">Expense by Category</h2>

        <?php if (empty($category_data)): ?>
            <p class="text-gray-500 text-sm">No data</p>
            <span class="material-symbols-outlined mt-4 text-5xl text-gray-400">
              sentiment_neutral
            </span>
        <?php else: ?>
            <div id="expensePie" class="w-full h-[300px]"></div>
        <?php endif; ?>

    </div>

    <!-- Budget + Daily Chart -->
    <div class="flex flex-col gap-6">
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="font-semibold text-gray-800 mb-2">Budget</h2>
        <p class="text-sm text-gray-600 mb-2">Total: Rp<?= number_format($budget, 0, ',', '.') ?></p>
        <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div class="bg-[#0A514B] h-3 rounded-full" style="width: <?= $percentage_used ?>%;"></div>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500"><?= round($percentage_used, 0) ?>%</span>
          <span class="text-red-500">Remaining: Rp<?= number_format($remaining, 0, ',', '.') ?></span>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="font-semibold text-gray-800 mb-2">Daily Expense Statistic</h2>

        <?php if (empty($category_data)): ?>
            <p class="text-gray-500 text-sm text-center">No data</p>
                <div class="flex justify-center items-center mt-4">
                  <span class="material-symbols-outlined text-5xl text-gray-400">
                      sentiment_neutral
                  </span>
                </div>
        <?php else: ?>
            <div id="dailyExpense" class="w-full h-[250px]"></div>
        <?php endif; ?>
      </div>
    </div>
  </div>

  <!-- Money Flow Chart -->
  <div class="bg-white rounded-xl shadow-md p-6 mt-8">
    <h2 class="font-semibold text-gray-800 mb-2 text-center">Money Flow (Income vs Expense)</h2>

        <?php if (empty($category_data)): ?>
            <p class="text-gray-500 text-sm text-center">No data</p>
                <div class="flex justify-center items-center mt-4">
                  <span class="material-symbols-outlined text-5xl text-gray-400">
                      sentiment_neutral
                  </span>
                </div>
        <?php else: ?>
            <div id="monthlyBar" class="w-full h-[350px]"></div>
        <?php endif; ?>
  </div>
</div>

  <!-- Scripts -->
  <script>
    // Flatpickr setup
    // Flatpickr setup (replace the old flatpickr init with this)
    flatpickr("#datePickerInput", {
      plugins: [new monthSelectPlugin({
        shorthand: true,
        dateFormat: "Y-m",
        altFormat: "M Y"
      })],
      defaultDate: "<?= $selected_year ?>-<?= str_pad($selected_month, 2, '0', STR_PAD_LEFT) ?>",
      onReady: function (selectedDates, dateStr, instance) {
        // Safeguard: dapatkan tanggal dari selectedDates atau dari defaultDate jika kosong
        let d;
        if (selectedDates && selectedDates.length > 0) {
          d = selectedDates[0];
        } else {
          // defaultDate format "YYYY-MM"
          const def = instance.config.defaultDate;
          // buat tanggal pertama bulan itu
          d = new Date(def + "-01");
        }

        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        if (d && !isNaN(d.getTime())) {
          document.getElementById("datePickerInput").value = months[d.getMonth()] + " " + d.getFullYear();
        }
      },
      onChange: function (selectedDates, dateStr) {
        if (!dateStr) return;
        // dateStr format "YYYY-MM" dari monthSelectPlugin
        const parts = dateStr.split("-");
        if (parts.length < 2) return;
        const year = parts[0];
        const month = parts[1];
        // redirect dengan parameter month (2-digit) & year
        window.location.href = `?month=${month}&year=${year}`;
      }
    });

    // Pie Chart
    new ApexCharts(document.querySelector("#expensePie"), {
      chart: { type: 'pie', height: 300 },
      series: <?= json_encode($category_amounts) ?>,
      labels: <?= json_encode($categories) ?>,
      colors: ['#0A514B', '#1F8A70', '#45C4B0', '#A6E3E9', '#FF8C00', '#FF6F61'],
      legend: { position: 'bottom' }
    }).render();

    // Money Flow
    new ApexCharts(document.querySelector("#monthlyBar"), {
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      series: [
        { name: 'Income', data: <?= json_encode($monthly_income) ?> },
        { name: 'Expense', data: <?= json_encode($monthly_expense) ?> }
      ],
      xaxis: { categories: <?= json_encode($months) ?> },
      colors: ['#1F8A70', '#063D35'],
      legend: { position: 'top' }
    }).render();

    // Daily Expense Chart
    new ApexCharts(document.querySelector("#dailyExpense"), {
      chart: { type: 'area', height: 250, toolbar: { show: false } },
      series: [{ name: 'Expense', data: <?= json_encode($daily_expenses) ?> }],
      xaxis: { categories: <?= json_encode($dates) ?> },
      stroke: { curve: 'smooth' },
      fill: { opacity: 0.3, type: 'gradient' },
      colors: ['#0A514B']
    }).render();
  </script>

   <script src="sidebar_script.js"></script>
</body>

</html>