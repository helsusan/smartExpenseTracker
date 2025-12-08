// dashboard.js
// Frontend that runs from S3 (static). It calls the backend API to fetch dashboard data.
// Make sure API_BASE_URL and USER_ID are set in the HTML before including this file.

// Helpers
function formatRupiah(num) {
  if (num === null || num === undefined) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function el(id) { return document.getElementById(id); }

const USER_ID = localStorage.getItem("user_id");

if (!USER_ID) {
  window.location.href = "index.html";
}

// Month picker init
(function initDatePicker() {

  // Ambil params dari URL
  const params = new URLSearchParams(window.location.search);
  const urlMonth = params.get('month');
  const urlYear = params.get('year');

  // Default: bulan & tahun hari ini
  const now = new Date();
  const selectedMonth = urlMonth ? urlMonth.padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
  const selectedYear = urlYear || now.getFullYear();

  flatpickr("#datePickerInput", {
    plugins: [
      new monthSelectPlugin({
        shorthand: true,
        dateFormat: "Y-m",
        altFormat: "M Y"
      })
    ],

    defaultDate: `${selectedYear}-${selectedMonth}`,

    onReady(selectedDates, dateStr, instance) {
      let d = selectedDates && selectedDates[0]
        ? selectedDates[0]
        : new Date(`${selectedYear}-${selectedMonth}-01`);

      const months = ["Januari","Februari","Maret","April","Mei","Juni",
                "Juli","Agustus","September","Oktober","November","Desember"];

      if (d && !isNaN(d.getTime())) {
        document.getElementById("datePickerInput").value =
          months[d.getMonth()] + " " + d.getFullYear();
      }
    },

    onChange(selectedDates, dateStr) {
      if (!dateStr) return;

      const parts = dateStr.split("-");
      if (parts.length < 2) return;

      const year = parts[0];
      const month = parts[1];

      const url = new URL(window.location.href);
      url.searchParams.set("month", month);
      url.searchParams.set("year", year);

      window.location.href = url.toString();
    }
  });

})();


// Read month/year from URL params (fallback to today)
function getSelectedMonthYear() {
  const params = new URLSearchParams(window.location.search);
  const month = parseInt(params.get('month')) || (new Date().getMonth() + 1);
  const year = parseInt(params.get('year')) || new Date().getFullYear();
  return { month, year };
}

// Load dashboard data from API
async function loadDashboard() {
  const { month, year } = getSelectedMonthYear();
  const userId = window.USER_ID || USER_ID;
  if (!userId) {
    alert("No user id configured. Set USER_ID in dashboard.html or implement login.");
    return;
  }

  // Build URL
  const url = `${"https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod"}/dashboard?userId=${encodeURIComponent(userId)}&month=${String(month).padStart(2,'0')}&year=${year}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      console.error('API error', await res.text());
      alert('Failed to load dashboard data. Check console.');
      return;
    }
    const data = await res.json();
    renderDashboard(data);
  } catch (err) {
    console.error(err);
    alert('Network error while loading dashboard data. See console.');
  }
}

// Render data to page + charts
function renderDashboard(data) {
  // Text values
  el('incomeValue').textContent = formatRupiah(data.total_income);
  el('expenseValue').textContent = formatRupiah(data.total_expense);
  el('balanceValue').textContent = formatRupiah(data.balance);
// Budget section
if (data.budget === 0 || data.budget === null || data.budget === undefined) {
    el('budgetValue').textContent = "Budget has not been set";
    el('budgetRemaining').textContent = "Remaining: -";
    el('budgetPercent').textContent = "-%";
    el('budgetBar').style.width = "0%";
} else {
    el('budgetValue').textContent = formatRupiah(data.budget);
    el('budgetRemaining').textContent = `Remaining: ${formatRupiah(data.remaining)}`;
    el('budgetPercent').textContent = `${Math.round(data.percentage_used)}%`;
    el('budgetBar').style.width = `${Math.min(100, Math.max(0, data.percentage_used))}%`;
}
  el('welcomeText').textContent = `Welcome, ${data.user_name ?? 'User'}!`;

  // Category chart
  if (!data.category_data || data.category_data.length === 0) {
    document.getElementById('expensePie').style.display = 'none';
    document.getElementById('noCategoryData').classList.remove('hidden');
  } else {
    document.getElementById('expensePie').style.display = '';
    document.getElementById('noCategoryData').classList.add('hidden');

    const series = data.category_data.map(r => Number(r.total_expense));
    const labels = data.category_data.map(r => r.category_name);

    new ApexCharts(document.querySelector("#expensePie"), {
      chart: { type: 'pie', height: 300 },
      series,
      labels,
      legend: { position: 'bottom' }
    }).render();
  }

  // Daily area chart
  if (!data.daily_data || data.daily_data.length === 0) {
    document.getElementById('dailyExpense').style.display = 'none';
    document.getElementById('noDailyData').classList.remove('hidden');
  } else {
    document.getElementById('dailyExpense').style.display = '';
    document.getElementById('noDailyData').classList.add('hidden');

    const categories = data.daily_data.map(r => r.day);
    const series = data.daily_data.map(r => Number(r.total));

    new ApexCharts(document.querySelector("#dailyExpense"), {
      chart: { type: 'area', height: 250, toolbar: { show: false } },
      series: [{ name: 'Expense', data: series }],
      xaxis: { categories },
      stroke: { curve: 'smooth' },
      fill: { opacity: 0.3, type: 'gradient' },
      colors: ['#0A514B']
    }).render();
  }

  // Money flow
  if (!data.money_flow || data.money_flow.length === 0) {
    document.getElementById('monthlyBar').style.display = 'none';
    document.getElementById('noMoneyFlow').classList.remove('hidden');
  } else {
    document.getElementById('monthlyBar').style.display = '';
    document.getElementById('noMoneyFlow').classList.add('hidden');

    const months = data.money_flow.map(r => r.month);
    const incomeSeries = data.money_flow.map(r => Number(r.total_income));
    const expenseSeries = data.money_flow.map(r => Number(r.total_expense));

    new ApexCharts(document.querySelector("#monthlyBar"), {
      chart: { type: 'bar', height: 300, toolbar: { show: false } },
      series: [
        { name: 'Income', data: incomeSeries },
        { name: 'Expense', data: expenseSeries }
      ],
      xaxis: { categories: months },
      colors: ['#1F8A70', '#063D35'],
      legend: { position: 'top' }
    }).render();
  }
}

// Startup
document.addEventListener('DOMContentLoaded', function () {
  loadDashboard();
});
