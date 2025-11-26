const API_BASE_URL = 'https://REPLACE_WITH_YOUR_API.execute-api.ap-southeast-1.amazonaws.com/prod';
const CURRENT_USER_ID = 3;
const CURRENT_USER_EMAIL = 'c14220072@john.petra.ac.id';

// DOM
const form = document.getElementById('createGroupForm');
const inviteInput = document.getElementById('invite-email');
const addParticipantBtn = document.getElementById('add-participant-btn');
const participantsListEl = document.getElementById('participants-list');
const participantsHidden = document.getElementById('participants-hidden-input');
const userEmailsDatalist = document.getElementById('user-emails');

let participants = new Set();
let lastSelectedEmail = "";

// ===================
// ALERT UI
// ===================
function showAlert(type, text) {
  const alerts = document.getElementById('alerts');
  alerts.innerHTML = `<div class="alert-${type === 'success' ? 'success' : 'error'}">${text}</div>`;
  setTimeout(() => alerts.innerHTML = '', 4000);
}

// ===================
// LOAD USERS LIST
// ===================
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/list?exclude_user_id=${CURRENT_USER_ID}`);
    const users = await res.json();
    
    userEmailsDatalist.innerHTML = '';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.email;
      opt.label = u.name;
      userEmailsDatalist.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
  }
}

// ================================
// ADD PARTICIPANT LOGIC
// ================================
inviteInput.addEventListener('input', e => {
  lastSelectedEmail = e.target.value.trim().toLowerCase();
});

addParticipantBtn.addEventListener('click', () => {
  const email = (inviteInput.value.trim() || lastSelectedEmail).toLowerCase();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showAlert('error', 'Invalid email format');
    return;
  }

  if (email === CURRENT_USER_EMAIL) {
    showAlert('error', 'You are already the admin');
    return;
  }

  if (participants.has(email)) {
    showAlert('error', 'This email is already added');
    return;
  }

  participants.add(email);

  updateHiddenInput();
  renderParticipants();
  hideFromDatalist(email);

  inviteInput.value = '';
  lastSelectedEmail = '';
});

function renderParticipants() {
  participantsListEl.innerHTML = '';

  participants.forEach(email => {
    const row = document.createElement('p');
    row.textContent = email;

    const removeBtn = document.createElement('span');
    removeBtn.textContent = ' ×';
    removeBtn.style.color = '#b91c1c';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.marginLeft = '8px';

    removeBtn.addEventListener('click', () => {
      participants.delete(email);
      updateHiddenInput();
      showInDatalist(email);
      renderParticipants();
    });

    row.appendChild(removeBtn);
    participantsListEl.appendChild(row);
  });
}

function updateHiddenInput() {
  participantsHidden.value = Array.from(participants).join(',');
}

function hideFromDatalist(email) {
  [...userEmailsDatalist.options].forEach(opt => {
    if (opt.value.toLowerCase() === email) opt.remove();
  });
}

function showInDatalist(email) {
  const opt = document.createElement('option');
  opt.value = email;
  userEmailsDatalist.appendChild(opt);
}

// ================================
// SUBMIT FORM -> API
// ================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    creator_id: CURRENT_USER_ID,
    group_name: document.getElementById('group-name').value.trim(),
    group_type: document.getElementById('group-type').value,
    group_budget: parseFloat(document.getElementById('group-budget').value || '0'),
    participants: Array.from(participants)
  };

  if (!payload.group_name || !payload.group_type) {
    showAlert('error', 'Group name and type are required');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/groups/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      showAlert('success', 'Group created!');
      form.reset();
      participants.clear();
      updateHiddenInput();
      renderParticipants();
      await loadUsers();
    } else {
      showAlert('error', data.message || 'Failed');
    }

  } catch (err) {
    showAlert('error', err.message || 'Server error');
  }
});

document.addEventListener('DOMContentLoaded', loadUsers);
