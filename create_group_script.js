/* =========================================
   KONFIGURASI UTAMA
   ========================================= */
   const API_BASE_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';

   // Ambil User ID & Name dari LocalStorage (diset saat login)
   // Jika tidak ada (user belum login), arahkan ke login page atau tangani error
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
   
   /* =========================================
      HELPER: Wait For Element
      ========================================= */
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
               resolve(null);
           }, timeout);
       });
   }
   
   document.addEventListener('DOMContentLoaded', () => {
       // 1. INIT SIDEBAR & LOAD GROUP LIST
       waitForElement('.sidebar').then((sidebarEl) => {
           if (sidebarEl) {
               initSidebar(); 
               if(USER_ID) loadSidebarGroups(); 
           }
       });
   
       // 2. LOAD USER LIST (Untuk Autocomplete Invite)
       if(USER_ID) loadUsersForInvite();
   
       // 3. INIT CREATE GROUP FORM
       initCreateGroupForm();
   });
   
   /* =========================================
      FUNGSI: Sidebar Init
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
      API: Load Group List ke Sidebar
      ========================================= */
   async function loadSidebarGroups() {
       const groupListUl = document.querySelector('.group-list');
       if(!groupListUl) return;
   
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
      API: Load Users untuk Invite
      ========================================= */
   async function loadUsersForInvite() {
       try {
           const res = await fetch(`${API_BASE_URL}/group-api/getUsers?excludeUserId=${USER_ID}`);
           if (!res.ok) throw new Error('Failed to fetch users');
   
           const users = await res.json();
           const dataList = document.getElementById('user-emails');
           
           if(dataList && Array.isArray(users)) {
               users.forEach(u => {
                   const opt = document.createElement('option');
                   opt.value = u.email;
                   dataList.appendChild(opt);
               });
           }
       } catch (err) {
           console.error("Error loading users:", err);
       }
   }
   
   /* =========================================
      API: Create Group Form Submit
      ========================================= */
   function initCreateGroupForm() {
       const form = document.getElementById('createGroupForm');
       const addBtn = document.getElementById('add-participant-btn');
       const emailInput = document.getElementById('invite-email');
       const participantsList = document.getElementById('participants-list');
       const dataList = document.getElementById('user-emails');
       const alertBox = document.getElementById('alerts');
   
       let invitedEmails = [];
   
       // --- Logic Tombol Add Participant ---
       if (addBtn && emailInput) {
           addBtn.addEventListener('click', () => {
               const email = emailInput.value.trim().toLowerCase();
               const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   
               if (!emailPattern.test(email)) {
                   alert('Please enter a valid email address.');
                   return;
               }
               if (invitedEmails.includes(email)) {
                   alert('This email is already added.');
                   return;
               }
   
               invitedEmails.push(email);
   
               const p = document.createElement('p');
               p.textContent = email;
               const removeBtn = document.createElement('span');
               removeBtn.textContent = ' ×';
               removeBtn.style.cssText = 'color:#006064; cursor:pointer; margin-left:8px; font-weight:bold;';
               
               removeBtn.addEventListener('click', () => {
                   invitedEmails = invitedEmails.filter(e => e !== email);
                   p.remove();
                   if (dataList) {
                       const opt = document.createElement('option');
                       opt.value = email;
                       dataList.appendChild(opt);
                   }
               });
   
               p.appendChild(removeBtn);
               participantsList.appendChild(p);
   
               if (dataList) {
                   for (let opt of dataList.options) {
                       if (opt.value === email) { opt.remove(); break; }
                   }
               }
               emailInput.value = '';
           });
       }
   
       // --- Logic Submit ke API ---
       if (form) {
           form.addEventListener('submit', async (e) => {
               e.preventDefault();
               
               if (!USER_ID) {
                   alertBox.innerHTML = `<div class="alert-error">User session not found. Please login again.</div>`;
                   return;
               }
   
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
                       alertBox.innerHTML = `<div class="alert-success">Group created successfully!</div>`;
                       form.reset();
                       invitedEmails = [];
                       participantsList.innerHTML = '';
                       loadSidebarGroups(); // Refresh sidebar
                   } else {
                       alertBox.innerHTML = `<div class="alert-error">Error: ${result.error || 'Failed to create group'}</div>`;
                   }
   
               } catch (err) {
                   alertBox.innerHTML = `<div class="alert-error">Network Error: ${err.message}</div>`;
               } finally {
                   submitBtn.disabled = false;
                   submitBtn.textContent = "Create Group";
               }
           });
       }
   }