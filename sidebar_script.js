/* ===== CONFIG ===== */
const API_BASE_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';

// Ambil user dari localStorage
var SIDEBAR_USER_ID = localStorage.getItem("user_id");

if (!SIDEBAR_USER_ID) {
  window.location.href = "login.html";
}

/* Helper: tunggu sampai elemen muncul */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      reject("Timeout waiting for element: " + selector);
    }, timeout);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  waitForElement('#sidebar').then(() => {
    setTimeout(() => {
      initSidebar();
      loadGroups();
    }, 50);
  }).catch(err => console.error(err));
});

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('hamburger-btn');

  if (!sidebar || !overlay || !toggleBtn) {
    console.error("Sidebar elements missing!");
    return;
  }

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}


/* Load group list */
async function loadGroups() {
  const ul = document.getElementById('groupList');
  if (!ul) {
    console.error("groupList not found!");
    return;
  }

  ul.innerHTML = '<li class="loading-message">Loading...</li>';

  try {
    const res = await fetch(`${API_BASE_URL}/groups/list?user_id=${SIDEBAR_USER_ID}`);
    const groups = await res.json();

    ul.innerHTML = '';

    if (!groups.length) {
      ul.innerHTML = `<li style="padding:10px;opacity:.6;font-size:.9rem;">No groups yet.</li>`;
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
    console.error(err);
    ul.innerHTML = '<li>Error loading groups</li>';
  }
}
