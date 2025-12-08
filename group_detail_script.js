const API_BASE = "https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod";
const USER_ID = localStorage.getItem("user_id");

// ========== GET PARAMS ==========
const params = new URLSearchParams(window.location.search);
const GROUP_ID = params.get("groupId");

if (!GROUP_ID || !USER_ID) {
  alert("Missing Group ID or User Session.");
  window.location.href = "dashboard.html";
}

function formatRupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
}
function el(id) { return document.getElementById(id); }

// ========== DATE PICKER ==========
(function initDatePicker() {
  const now = new Date();
  const selectedMonth = params.get("month") || String(now.getMonth() + 1).padStart(2, "0");
  const selectedYear = params.get("year") || now.getFullYear();

  flatpickr("#datePickerInput", {
    plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "M Y" })],
    defaultDate: `${selectedYear}-${selectedMonth}`,
    onReady(selectedDates) {
      const d = selectedDates[0] || new Date(`${selectedYear}-${selectedMonth}-01`);
      const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
      el("datePickerInput").value = months[d.getMonth()] + " " + d.getFullYear();
    },
    onChange(selectedDates, dateStr) {
      if (!dateStr) return;
      const [year, month] = dateStr.split("-");
      window.location.href = `group_detail.html?groupId=${GROUP_ID}&month=${month}&year=${year}`;
    }
  });
})();

// ========== LOAD DATA ==========
async function loadGroupData() {
  const month = params.get("month") || new Date().getMonth() + 1;
  const year = params.get("year") || new Date().getFullYear();

  const url = `${API_BASE}/dashboard/group?groupId=${GROUP_ID}&userId=${USER_ID}&month=${month}&year=${year}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 403) alert("Anda bukan anggota grup ini");
      throw new Error(await res.text());
    }
    const data = await res.json();
    renderPage(data);
  } catch (err) {
    console.error(err);
  }
}

// ========== RENDER PAGE ==========
function renderPage(data) {
  const { info, stats, charts, members, current_user_role } = data;

  // header
  el("groupNameTitle").textContent = info.name;
  const badge = el("groupRoleBadge");
  badge.textContent = current_user_role;
  badge.classList.remove("hidden");
  badge.className =
    current_user_role === "Admin"
      ? "text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded w-fit mt-1 font-semibold"
      : "text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded w-fit mt-1";

  // cards
  el("budgetValueCard").textContent = formatRupiah(info.budget);
  el("expenseValue").textContent = formatRupiah(stats.total_expense);
  el("balanceValue").textContent = formatRupiah(stats.remaining);
  el("memberCount").textContent = members.length;

  // budget bar
  el("budgetRemaining").textContent = `Remaining: ${formatRupiah(stats.remaining)}`;
  el("budgetPercent").textContent = `${Math.round(stats.percentage_used)}% Used`;
  el("budgetBar").style.width = `${Math.min(100, stats.percentage_used)}%`;

  // member list
  const container = el("memberListContainer");
  container.innerHTML = "";
  members.forEach(m => {
    const html = `
      <div class="member-item">
        <div class="member-avatar">${m.name.charAt(0)}</div>
        <div class="member-info">
          <div class="member-name">${m.name} ${m.id == USER_ID ? "(You)" : ""}</div>
          <span class="member-role ${m.role === "Admin" ? "admin" : ""}">${m.role}</span>
        </div>
      </div>`;
    container.insertAdjacentHTML("beforeend", html);
  });

  // charts
  renderCharts(charts);
}

function renderCharts(charts) {
  const { category_data, daily_data, member_contribution } = charts;

  // category pie
  if (!category_data.length) {
    el("expensePie").style.display = "none";
    el("noCategoryData").classList.remove("hidden");
  } else {
    new ApexCharts(el("expensePie"), {
      chart: { type: "pie", height: 300 },
      series: category_data.map(x => Number(x.total_expense)),
      labels: category_data.map(x => x.category_name)
    }).render();
  }

  // member donut
  if (!member_contribution.length) {
    el("memberPie").style.display = "none";
    el("noMemberData").classList.remove("hidden");
  } else {
    new ApexCharts(el("memberPie"), {
      chart: { type: "donut", height: 250 },
      series: member_contribution.map(x => Number(x.total_spent)),
      labels: member_contribution.map(x => x.name)
    }).render();
  }

  // daily chart
  if (!daily_data.length) {
    el("dailyExpense").style.display = "none";
    el("noDailyData").classList.remove("hidden");
  } else {
    new ApexCharts(el("dailyExpense"), {
      chart: { type: "area", height: 250 },
      series: [{ name: "Expense", data: daily_data.map(x => Number(x.total)) }],
      xaxis: { categories: daily_data.map(x => x.day) }
    }).render();
  }
}

// start
document.addEventListener("DOMContentLoaded", loadGroupData);
