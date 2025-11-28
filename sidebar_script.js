/* ===== CONFIG ===== */
const API_BASE_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';

// Ambil user ID dari localStorage (user yang login)
var SIDEBAR_USER_ID = localStorage.getItem("user_id");

/* Redirect kalau belum login */
if (!SIDEBAR_USER_ID) {
  window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('toggle-btn') || document.getElementById('hamburger-btn');
  const toggleIcon = toggleBtn ? toggleBtn.querySelector('.material-icons, .material-icons-outlined') : null;

  // ======== SIDEBAR TOGGLE ==========
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');

    if (toggleIcon) {
      toggleIcon.textContent = sidebar.classList.contains('open') ? 'close' : 'menu';
    }
  }

  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
  }

  // ========== LOAD GROUP LIST FROM API ===========
  loadGroups();
});

/* =======================================
   Fetch user groups from API Gateway
=======================================*/
async function loadGroups() {
  const ul = document.getElementById('groupList');
  ul.innerHTML = '<li class="loading-message">Loading...</li>';

  try {
    const res = await fetch(`${API_BASE_URL}/groups/list?user_id=${SIDEBAR_USER_ID}`);
    const groups = await res.json();

    ul.innerHTML = '';

    if (!groups.length) {
      ul.innerHTML = `
        <li style="padding:10px;opacity:.6;font-size:.9rem;">
          No groups yet.
        </li>`;
      return;
    }

    groups.forEach(g => {
      const li = document.createElement('li');
      li.innerHTML = `
        <a href="group_detail.html?id=${g.id}" class="group-item">
          <span class="material-icons-outlined">group</span>
          <span>${g.name}</span>
        </a>`;
      ul.appendChild(li);
    });

  } catch (err) {
    ul.innerHTML = '<li>Error loading groups</li>';
  }
}
