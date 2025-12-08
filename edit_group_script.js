   const API_BASE_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';
   const USER_ID = localStorage.getItem("user_id");
   const USER_NAME = localStorage.getItem("user_name");
   
   if (!USER_ID) {
     console.error("No user session found - please login.");
   }
   
   function getGroupIdFromUrl() {
     const params = new URLSearchParams(window.location.search);
     return params.get('id') || null;
   }
   
   function showAlert(type, message, timeout = 3500) {
     const alerts = document.getElementById('alerts');
     alerts.innerHTML = `
       <div class="alert-box alert-${type}">
         <span class="alert-icon material-icons-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
         <div class="alert-text">${message}</div>
         <button class="alert-close" aria-label="close">&times;</button>
       </div>
     `;
     const closeBtn = alerts.querySelector('.alert-close');
     closeBtn.addEventListener('click', () => alerts.innerHTML = '');
     if (timeout) setTimeout(() => { alerts.innerHTML = ''; }, timeout);
   }
   
   /* small utility */
   function el(id) { return document.getElementById(id); }
   
   /* STATE */
   let GROUP_ID = getGroupIdFromUrl();
   let groupData = null;
   let members = [];        // member rows from API (includes role + status)
   let availableUsers = []; // all users for invite (id,name,email), we will filter out those already members
   
   function waitFor(selector, timeout = 3000) {
     return new Promise((resolve) => {
       const interval = setInterval(() => {
         const el = document.querySelector(selector);
         if (el) { clearInterval(interval); resolve(el); }
       }, 80);
       setTimeout(() => { clearInterval(interval); resolve(null); }, timeout);
     });
   }
   
   /* ===========================
      INIT
      =========================== */
   document.addEventListener('DOMContentLoaded', async () => {
     // welcome
     const w = el('welcomeText');
     if (w) w.textContent = `Welcome, ${USER_NAME || 'User'}!`;
   
     if (!GROUP_ID) {
       showAlert('error', 'Group ID not provided in URL.');
       return;
     }
   
     await loadGroup();
     await loadGroupMembers();
     await loadUsersForInvite();
     renderForm();
     initFormHandlers();
   
     // init sidebar if present
     waitFor('.sidebar').then(s => {
       if (s && typeof initSidebar === 'function') {
         try { initSidebar(); loadSidebarGroups(); } catch (e) { /* ignore */ }
       }
     });
   });
   
   /* ===========================
      LOAD DATA
      =========================== */
   async function loadGroup() {
     try {
       const res = await fetch(`${API_BASE_URL}/group-api/getGroup?groupId=${encodeURIComponent(GROUP_ID)}`);
       if (!res.ok) throw new Error('Failed to load group');
       groupData = await res.json();
     } catch (err) {
       console.error(err);
       showAlert('error', 'Gagal load group: ' + err.message);
     }
   }
   
   async function loadGroupMembers() {
     try {
       const res = await fetch(`${API_BASE_URL}/group-api/getGroupMembers?groupId=${encodeURIComponent(GROUP_ID)}`);
       if (!res.ok) throw new Error('Failed to load members');
       members = await res.json();
     } catch (err) {
       console.error(err);
       showAlert('error', 'Gagal load members: ' + err.message);
     }
   }
   
   async function loadUsersForInvite() {
     try {
       const res = await fetch(`${API_BASE_URL}/group-api/getUsers?excludeUserId=${encodeURIComponent(USER_ID)}`);
       if (!res.ok) throw new Error('Failed to load users');
       availableUsers = await res.json();
       // remove those already member (active or removed) from dropdown options
       const memberEmails = new Set(members.map(m => (m.email || '').toLowerCase()));
       availableUsers = availableUsers.filter(u => !memberEmails.has((u.email||'').toLowerCase()));
     } catch (err) {
       console.error(err);
       showAlert('error', 'Gagal load users: ' + err.message);
     }
   }
   
   /* ===========================
      RENDER UI
      =========================== */
   function renderForm() {
     // fill group fields
     if (groupData) {
       el('group-name').value = groupData.name || '';
       el('group-type').value = groupData.type || '';
       el('group-budget').value = groupData.budget || 0;
       el('pageTitle').textContent = `Edit Group: ${groupData.name || ''}`;
       el('groupStatusLine').textContent = `Created by: ${groupData.created_by_name || '—'}`;
     }
   
     renderMembersList();
   }
   
   /* RENDER MEMBERS */
   function renderMembersList() {
     const container = el('members-list');
     container.innerHTML = '';
   
     if (!members || members.length === 0) {
       container.innerHTML = '<div style="color:#666;padding:8px 0;">No members</div>';
       return;
     }
   
     members.forEach(m => {
       const row = document.createElement('div');
       row.className = 'member-row';
       row.style.display = 'flex';
       row.style.justifyContent = 'space-between';
       row.style.alignItems = 'center';
       row.style.padding = '6px 0';
       row.style.borderBottom = '1px solid #f0f0f0';
   
       const left = document.createElement('div');
       left.innerHTML = `<strong style="font-weight:600">${m.name || m.email}</strong> <span style="color:#666;font-size:.9rem;margin-left:8px">(${m.role}${m.status ? ' • ' + m.status : ''})</span>`;
   
       const right = document.createElement('div');
   
       // don't allow removing admin (yourself) if you're admin (protect)
       const isCurrentUser = String(m.user_id) === String(USER_ID);
       const isAdmin = members.some(x => String(x.user_id) === String(USER_ID) && x.role === 'Admin');
   
       // Show remove button only if current user is admin AND target is not admin
       if (isAdmin && m.role !== 'Admin') {
         const btn = document.createElement('button');
         btn.type = 'button';
         btn.className = 'submit-btn';
         btn.style.background = '#fff';
         btn.style.color = '#b91c1c';
         btn.style.border = '1px solid #f5c2c7';
         btn.textContent = 'Remove';
         btn.addEventListener('click', () => confirmRemoveMember(m.user_id, m.name || m.email));
         right.appendChild(btn);
       } else {
         // no action (or maybe show disabled text)
         const label = document.createElement('div');
         label.style.fontSize = '.9rem';
         label.style.color = '#888';
         label.textContent = isCurrentUser ? 'You' : '';
         right.appendChild(label);
       }
   
       row.appendChild(left);
       row.appendChild(right);
       container.appendChild(row);
     });
   }
   
   /* ===========================
      FORM HANDLERS
      =========================== */
   function initFormHandlers() {
     const emailInput = el('invite-email');
     const dropdown = el('email-dropdown');
     const addBtn = el('add-member-btn');
     const form = el('editGroupForm');
     const saveBtn = el('saveBtn');
     const cancelBtn = el('cancelBtn');
   
     // open dropdown on click
     emailInput.addEventListener('click', (e) => {
       e.stopPropagation();
       renderEmailDropdown("");
     });
   
     // filter as user types
     emailInput.addEventListener('input', () => {
       renderEmailDropdown(emailInput.value);
     });
   
     // hide dropdown when clicking outside
     document.addEventListener('click', (ev) => {
       if (!emailInput.contains(ev.target) && !dropdown.contains(ev.target)) {
         dropdown.classList.add('hidden');
       }
     });
   
     // Add member button
     addBtn.addEventListener('click', async () => {
       const email = emailInput.value.trim().toLowerCase();
       if (!email) { showAlert('error', 'Please choose a user to add.'); return; }
   
       // simple validation: check in availableUsers
       const u = availableUsers.find(x => x.email.toLowerCase() === email);
       if (!u) { showAlert('error', 'User not available or already a member.'); return; }
   
       try {
         addBtn.disabled = true;
         addBtn.textContent = 'Adding...';
   
         const res = await fetch(`${API_BASE_URL}/group-api/addMember`, {
           method: 'POST',
           headers: {'Content-Type':'application/json'},
           body: JSON.stringify({ userId: USER_ID, groupId: GROUP_ID, email: u.email })
         });
   
         const json = await res.json();
         if (!res.ok) throw new Error(json.error || 'Failed to add');
   
         showAlert('success', 'Member added.');
         // after success: refresh members + users lists
         await loadGroupMembers();
         await loadUsersForInvite();
         renderMembersList();
         emailInput.value = '';
         dropdown.classList.add('hidden');
       } catch (err) {
         console.error(err);
         showAlert('error', 'Add member failed: ' + err.message);
       } finally {
         addBtn.disabled = false;
         addBtn.textContent = 'Add';
       }
     });
   
     // Save changes
     form.addEventListener('submit', async (e) => {
       e.preventDefault();
       // only admin may save; check
       const isAdmin = members.some(x => String(x.user_id) === String(USER_ID) && x.role === 'Admin');
       if (!isAdmin) { showAlert('error', 'Only group admin can edit group.'); return; }
   
       const name = el('group-name').value.trim();
       const budget = parseFloat(el('group-budget').value || 0);
   
       saveBtn.disabled = true;
       saveBtn.textContent = 'Saving...';
   
       try {
         const res = await fetch(`${API_BASE_URL}/group-api/updateGroup`, {
           method: 'POST',
           headers: {'Content-Type':'application/json'},
           body: JSON.stringify({ userId: USER_ID, groupId: GROUP_ID, name, budget })
         });
         const json = await res.json();
         if (!res.ok) throw new Error(json.error || 'Failed to update');
   
         showAlert('success', 'Group updated.');
         // reload
         await loadGroup();
         renderForm();
       } catch (err) {
         console.error(err);
         showAlert('error', 'Update failed: ' + err.message);
       } finally {
         saveBtn.disabled = false;
         saveBtn.textContent = 'Save Changes';
       }
     });
   
     cancelBtn.addEventListener('click', () => {
       // simple: reload original values
       renderForm();
       showAlert('success', 'Changes discarded.');
     });
   
   }
   
   /* ===========================
      EMAIL DROPDOWN RENDER
      =========================== */
   function renderEmailDropdown(filterText = "") {
     const dropdown = el('email-dropdown');
     dropdown.innerHTML = '';
   
     let list = availableUsers || [];
   
     if (filterText && filterText.trim() !== '') {
       const q = filterText.trim().toLowerCase();
       list = list.filter(u => (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q));
     }
   
     if (!list.length) {
       dropdown.classList.add('hidden');
       return;
     }
   
     dropdown.classList.remove('hidden');
     list.forEach(u => {
       const div = document.createElement('div');
       div.className = 'dropdown-item';
       div.style.padding = '8px 10px';
       div.style.cursor = 'pointer';
       div.style.borderBottom = '1px solid #f3f3f3';
       div.textContent = `${u.name ? u.name + ' – ' : ''}${u.email}`;
       div.addEventListener('click', (e) => {
         el('invite-email').value = u.email;
         dropdown.classList.add('hidden');
       });
       dropdown.appendChild(div);
     });
   }
   
   /* ===========================
      REMOVE MEMBER -> update status = 'Removed'
      =========================== */
   async function confirmRemoveMember(memberUserId, memberName) {
     if (!confirm(`Remove ${memberName}? This will set their membership status to Removed.`)) return;
   
     try {
       const res = await fetch(`${API_BASE_URL}/group-api/removeMember`, {
         method: 'POST',
         headers: {'Content-Type':'application/json'},
         body: JSON.stringify({ userId: USER_ID, groupId: GROUP_ID, memberUserId })
       });
       const json = await res.json();
       if (!res.ok) throw new Error(json.error || 'Failed to remove');
   
       showAlert('success', 'Member removed (status updated).');
       await loadGroupMembers();
       await loadUsersForInvite();
       renderMembersList();
     } catch (err) {
       console.error(err);
       showAlert('error', 'Remove failed: ' + err.message);
     }
   }
   