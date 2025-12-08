/* =========================================
   KONFIGURASI UTAMA
   ========================================= */
   const API_BASE_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';

   // Ambil User ID & Name dari LocalStorage
   const USER_ID = localStorage.getItem("user_id");
   const USER_NAME = localStorage.getItem("user_name");
   
   if (!USER_ID) {
       console.error("User ID not found. Please login.");
   } else {
       const welcomeText = document.getElementById('welcomeText');
       if (welcomeText) {
           welcomeText.textContent = `Welcome, ${USER_NAME || 'User'}!`;
       }
   }
   
   /* =========================================
      HELPER: Wait For Element
      ========================================= */
   function waitForElement(selector, timeout = 5000) {
       return new Promise((resolve) => {
           const interval = setInterval(() => {
               const el = document.querySelector(selector);
               if (el) {
                   clearInterval(interval);
                   resolve(el);
               }
           }, 100);
           setTimeout(() => {
               clearInterval(interval);
               resolve(null);
           }, timeout);
       });
   }
   
   /* =========================================
      ALERT UI MODERN
      ========================================= */
   function showAlert(type, message) {
       const alertBox = document.getElementById('alerts');
       alertBox.innerHTML = `
           <div class="alert-box alert-${type}">
               <span class="alert-icon material-icons-outlined">
                   ${type === "success" ? "check_circle" : "error"}
               </span>
               <span>${message}</span>
               <span class="alert-close" onclick="this.parentElement.remove()">×</span>
           </div>
       `;
   }
   
   document.addEventListener('DOMContentLoaded', () => {
       waitForElement('.sidebar').then((sidebarEl) => {
           if (sidebarEl) {
               initSidebar();
               if (USER_ID) loadSidebarGroups();
           }
       });
   
       if (USER_ID) loadUsersForInvite();
       initCreateGroupForm();
   });
   
   /* =========================================
      SIDEBAR INIT
      ========================================= */
   function initSidebar() {
       const sidebar = document.querySelector('.sidebar');
       const overlay = document.getElementById('sidebar-overlay');
       const toggleBtn = document.getElementById('hamburger-btn');
   
       if (!sidebar || !toggleBtn) return;
   
       const newBtn = toggleBtn.cloneNode(true);
       toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
   
       newBtn.addEventListener('click', (e) => {
           e.stopPropagation();
           sidebar.classList.toggle('open');
           if (overlay) overlay.classList.toggle('open');
       });
   
       if (overlay) {
           overlay.addEventListener('click', () => {
               sidebar.classList.remove('open');
               overlay.classList.remove('open');
           });
       }
   }
   
   /* =========================================
      API: Load Group List Sidebar
      ========================================= */
   async function loadSidebarGroups() {
       const groupListUl = document.querySelector('.group-list');
       if (!groupListUl) return;
   
       try {
           const res = await fetch(`${API_BASE_URL}/group-api/getGroupList?userId=${USER_ID}`);
           if (!res.ok) throw new Error('Failed to fetch groups');
   
           const groups = await res.json();
           groupListUl.innerHTML = '';
   
           if (!groups || groups.length === 0) {
               groupListUl.innerHTML = '<li style="padding:10px; color:rgba(255,255,255,0.5);">No groups yet.</li>';
               return;
           }
   
           groups.forEach(g => {
               const li = document.createElement('li');
               li.innerHTML = `
                   <a href="group_detail.html?id=${g.id}" class="group-item">
                       <span class="material-icons-outlined">group</span>
                       <span>${g.name}</span>
                   </a>
               `;
               groupListUl.appendChild(li);
           });
   
       } catch (err) {
           console.error("Error loading groups:", err);
           groupListUl.innerHTML = '<li style="padding:10px; color:#f87171;">Error loading groups.</li>';
       }
   }
   
   /* =========================================
      LOAD USERS UNTUK INVITE
      ========================================= */
   let availableUsers = [];
   
   async function loadUsersForInvite() {
       try {
           const res = await fetch(`${API_BASE_URL}/group-api/getUsers?excludeUserId=${USER_ID}`);
           if (!res.ok) throw new Error('Failed to fetch users');
   
           availableUsers = await res.json();
       } catch (err) {
           console.error("Error loading users:", err);
       }
   }
   
   /* =========================================
      RENDER DROPDOWN
      ========================================= */
   function renderDropdown(filterText = "") {
       const dropdown = document.getElementById("email-dropdown");
       dropdown.innerHTML = "";
   
       let filtered = availableUsers;
   
       if (filterText.trim() !== "") {
           filtered = availableUsers.filter(u =>
               u.email.toLowerCase().includes(filterText.toLowerCase()) ||
               (u.name && u.name.toLowerCase().includes(filterText.toLowerCase()))
           );
       }
   
       if (filtered.length === 0) {
           dropdown.classList.add("hidden");
           return;
       }
   
       dropdown.classList.remove("hidden");
   
       filtered.forEach(user => {
           const item = document.createElement("div");
           item.className = "dropdown-item";
           item.textContent = `${user.email}`;
   
           item.addEventListener("click", () => {
               selectEmail(user.email);
           });
   
           dropdown.appendChild(item);
       });
   }
   
   /* =========================================
      PILIH EMAIL
      ========================================= */
   function selectEmail(email) {
       const emailInput = document.getElementById("invite-email");
       emailInput.value = email;
   
       document.getElementById("email-dropdown").classList.add("hidden");
   }
   
   /* =========================================
      CREATE GROUP FORM
      ========================================= */
   function initCreateGroupForm() {
       const form = document.getElementById('createGroupForm');
       const addBtn = document.getElementById('add-participant-btn');
       const emailInput = document.getElementById('invite-email');
       const participantsList = document.getElementById('participants-list');
   
       let invitedEmails = [];
   
       // Dropdown muncul saat input diklik
       emailInput.addEventListener("click", () => {
           renderDropdown("");
       });
   
       // Filter saat mengetik
       emailInput.addEventListener("input", () => {
           renderDropdown(emailInput.value);
       });
   
       // Tutup dropdown saat klik di luar input
       document.addEventListener("click", (e) => {
           if (!emailInput.contains(e.target) && !document.getElementById("email-dropdown").contains(e.target)) {
               document.getElementById("email-dropdown").classList.add("hidden");
           }
       });
   
       // Tombol Add
       addBtn.addEventListener("click", () => {
           const email = emailInput.value.trim().toLowerCase();
           const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   
           if (!emailPattern.test(email)) {
               showAlert("error", "Please enter a valid email address.");
               return;
           }
           if (invitedEmails.includes(email)) {
               showAlert("error", "This email is already added.");
               return;
           }
   
           invitedEmails.push(email);
   
           availableUsers = availableUsers.filter(u => u.email !== email);
           renderDropdown("");
   
           const p = document.createElement("p");
           p.textContent = email;
   
           const removeBtn = document.createElement("span");
           removeBtn.textContent = " ×";
           removeBtn.style.cssText = "color:#006064; cursor:pointer; margin-left:8px; font-weight:bold;";
   
           removeBtn.addEventListener("click", () => {
               invitedEmails = invitedEmails.filter(e => e !== email);
               p.remove();
               availableUsers.push({ email });
               renderDropdown("");
           });
   
           p.appendChild(removeBtn);
           participantsList.appendChild(p);
   
           emailInput.value = "";
       });
   
       // Submit Form
       form.addEventListener("submit", async (e) => {
           e.preventDefault();
   
           const submitBtn = form.querySelector('.submit-btn');
           submitBtn.disabled = true;
           submitBtn.textContent = "Creating...";
   
           const payload = {
               userId: USER_ID,
               group_name: document.getElementById('group-name').value,
               group_type: document.getElementById('group-type').value,
               group_budget: document.getElementById('group-budget').value,
               participants: invitedEmails
           };
   
           try {
               const res = await fetch(`${API_BASE_URL}/group-api/createGroup`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify(payload)
               });
   
               const result = await res.json();
   
               if (res.ok) {
                   showAlert("success", "Group created successfully!");
                   form.reset();
                   invitedEmails = [];
                   participantsList.innerHTML = "";
                   loadSidebarGroups();
               } else {
                   showAlert("error", result.error || "Failed to create group.");
               }
   
           } catch (err) {
               showAlert("error", "Network Error: " + err.message);
           } finally {
               submitBtn.disabled = false;
               submitBtn.textContent = "Create Group";
           }
       });
   }
   