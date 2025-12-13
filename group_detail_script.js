const API_BASE = "https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod";
const USER_ID = localStorage.getItem("user_id");

// ========== GET PARAMS ==========
const params = new URLSearchParams(window.location.search);
const GROUP_ID = params.get("groupId");

// Cek apakah ada parameter bulan/tahun di URL (artinya user sedang memfilter)
const urlMonth = params.get("month");
const urlYear = params.get("year");

if (!GROUP_ID || !USER_ID) {
  alert("Missing Group ID or User Session.");
  window.location.href = "dashboard.html";
}

function formatRupiah(num) {
  return "Rp " + Number(num || 0).toLocaleString("id-ID");
}
function el(id) { return document.getElementById(id); }

// ========== DATE PICKER ==========

// Kita simpan instance flatpickr di variabel agar bisa diupdate nanti
let datePickerInstance;

(function initDatePicker() {
  // Jika URL punya param, pakai itu. Jika tidak, jangan set defaultDate dulu (biar API yang nentuin).
  const defaultDate = (urlMonth && urlYear) ? `${urlYear}-${urlMonth}` : null;

  datePickerInstance = flatpickr("#datePickerInput", {
    plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "M Y" })],
    defaultDate: defaultDate, 
    // Placeholder teks jika All Time
    onReady(selectedDates, dateStr, instance) {
      if(defaultDate) {
         const d = selectedDates[0];
         const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
         if(d) el("datePickerInput").value = months[d.getMonth()] + " " + d.getFullYear();
      } else {
         // Jika belum ada tanggal (loading awal), kita tulis loading atau kosong dulu
         el("datePickerInput").value = "Loading..."; 
      }
    },
    onChange(selectedDates, dateStr) {
      if (!dateStr) return;
      const [year, month] = dateStr.split("-");
      // Reload halaman dengan filter
      window.location.href = `group_detail.html?groupId=${GROUP_ID}&month=${month}&year=${year}`;
    }
  });
})();

// ========== LOAD DATA ==========
async function loadGroupData() {
  // Bangun URL API
  let url = `${API_BASE}/group-api/getGroupDetail?groupId=${GROUP_ID}&userId=${USER_ID}`;
  
  // Hanya kirim month & year JIKA ada di URL parameter
  if (urlMonth && urlYear) {
      url += `&month=${urlMonth}&year=${urlYear}`;
  }

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
  const { info, stats, charts, members, current_user_role, view_state } = data;

  // 1. Update Teks Date Picker (Logika "All Time" vs "Bulan Tertentu")
  if (view_state === 'All Time') {
      // Jika Backend bilang ini mode All Time (untuk One Time Group)
      el("datePickerInput").value = "All Time Data";
  } else {
      // Jika Regular group atau user memfilter tanggal
      // view_state formatnya "MM-YYYY", kita ubah jadi teks yang enak dibaca
      if (view_state) {
        const [m, y] = view_state.split('-');
        const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
        const monthName = months[parseInt(m) - 1];
        el("datePickerInput").value = `${monthName} ${y}`;
        
        // Opsional: Sinkronkan internal date picker jika instance tersedia
        if (typeof datePickerInstance !== 'undefined') {
            datePickerInstance.setDate(`${y}-${m}-01`, false);
        }
      }
  }

  // 2. HEADER SETUP (Judul & Tombol Edit)
  const titleEl = el("groupNameTitle");
  titleEl.textContent = info.name; // Set nama grup

  // === FIX: TAMBAHKAN TOMBOL EDIT JIKA ADMIN ===
  if (current_user_role === 'Admin') {
      const editLink = document.createElement('a');
      // Arahkan ke halaman edit_group.html dengan ID grup
      editLink.href = `edit_group.html?id=${info.id}`; 
      
      // Styling menggunakan Tailwind (ikon pensil putih/transparan)
      editLink.className = "ml-3 inline-flex items-center text-white/70 hover:text-white transition-colors cursor-pointer";
      editLink.title = "Edit Group";
      editLink.innerHTML = '<span class="material-icons-outlined" style="font-size: 1.2rem;">edit</span>';
      
      titleEl.appendChild(editLink);
  }
  // ============================================

  // 3. BADGE ROLE
  const badge = el("groupRoleBadge");
  // Tampilkan Role dan Tipe Grup
  badge.innerHTML = `${current_user_role} <span style="opacity:0.6; font-weight:400">| ${info.type}</span>`;
  badge.classList.remove("hidden");
  
  // Warna badge beda untuk Admin dan Member
  badge.className =
    current_user_role === "Admin"
      ? "text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded w-fit mt-1 font-semibold block"
      : "text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded w-fit mt-1 block";

  // 4. INFO CARDS
  el("budgetValueCard").textContent = formatRupiah(info.budget);
  el("expenseValue").textContent = formatRupiah(stats.total_expense);
  el("balanceValue").textContent = formatRupiah(stats.remaining);
  el("memberCount").textContent = members.length;

  // 5. BUDGET BAR
  el("budgetRemaining").textContent = `Remaining: ${formatRupiah(stats.remaining)}`;
  el("budgetPercent").textContent = `${Math.round(stats.percentage_used)}% Used`;
  el("budgetBar").style.width = `${Math.min(100, stats.percentage_used)}%`;

  // 6. MEMBER LIST
  const container = el("memberListContainer");
  container.innerHTML = "";
  members.forEach(m => {
    const html = `
      <div class="member-item">
        <div class="member-avatar">${m.name.charAt(0).toUpperCase()}</div>
        <div class="member-info">
          <div class="member-name">${m.name} ${m.id == USER_ID ? "(You)" : ""}</div>
          <span class="member-role ${m.role === "Admin" ? "admin" : ""}">${m.role}</span>
        </div>
      </div>`;
    container.insertAdjacentHTML("beforeend", html);
  });

  // 7. RENDER CHARTS
  renderCharts(charts);
}

function renderCharts(charts) {
  const { category_data, daily_data, member_contribution } = charts;

  // category pie
  if (!category_data.length) {
    el("expensePie").style.display = "none";
    el("noCategoryData").classList.remove("hidden");
  } else {
    el("expensePie").style.display = "block";
    el("noCategoryData").classList.add("hidden");
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
    el("memberPie").style.display = "block";
    el("noMemberData").classList.add("hidden");
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
    el("dailyExpense").style.display = "block";
    el("noDailyData").classList.add("hidden");
    
    // Format tanggal agar lebih rapih (DD/MM)
    const formattedDates = daily_data.map(x => {
        const d = new Date(x.day);
        return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear().toString().substr(-2)}`;
    });

    new ApexCharts(el("dailyExpense"), {
      chart: { type: "area", height: 250 },
      series: [{ name: "Expense", data: daily_data.map(x => Number(x.total)) }],
      xaxis: { categories: formattedDates }
    }).render();
  }
}

// start
document.addEventListener("DOMContentLoaded", loadGroupData);
