/* FILE: income_script.js
   CHANGED: Added API calls (get groups + submit to API).
   IMPORTANT: Set INCOME_API_URL to the domain where your PHP API is hosted (https://api.example.com).
*/

const INCOME_API_URL = 'https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod';

const CURRENT_USER_ID = localStorage.getItem('user_id');
const CURRENT_USER_NAME = localStorage.getItem('user_name');

// Cek apakah user sudah login
if (!CURRENT_USER_ID) {
    alert("You are not logged in!");
    window.location.href = 'login.html';
}

// Tampilkan nama user di navbar
const welcomeName = document.getElementById('welcomeName');
if (welcomeName && CURRENT_USER_NAME) {
    welcomeName.textContent = `Welcome, ${CURRENT_USER_NAME}!`;
}

// Format currency input
const totalAmountInput = document.getElementById('totalAmount');
const amountHidden = document.getElementById('amountHidden');
const incomeForm = document.getElementById('incomeForm');
const groupsContainer = document.getElementById('groupsContainer');
const alertsContainer = document.getElementById('alerts');
const incomeDate = document.getElementById('incomeDate');

// set default date to today (since PHP's date() removed)
(function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    incomeDate.value = today;
})();

function formatRupiah(value) {
    const number = parseInt(value.toString().replace(/[^0-9]/g, ''));
    if (isNaN(number)) return 'Rp 0';
    return 'Rp ' + number.toLocaleString('id-ID');
}

function parseRupiah(value) {
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
}

totalAmountInput.addEventListener('input', function(e) {
    this.value = formatRupiah(this.value);
});

// --- CHANGED: load groups from API and render checkboxes ---
async function loadFormGroups() {
    try {
        groupsContainer.innerHTML = '<div>Loading groups...</div>';
        const res = await fetch(`${INCOME_API_URL}/api/get_groups.php?user_id=${CURRENT_USER_ID}`, {
            method: 'GET',
            credentials: 'omit' // we are using stateless API here
        });
        if (!res.ok) throw new Error('Failed to fetch groups');
        const data = await res.json();

        // Expecting data to be array of {id, name}
        if (!Array.isArray(data)) {
            groupsContainer.innerHTML = '<div>No groups found.</div>';
            return;
        }

        groupsContainer.innerHTML = '';
        data.forEach(group => {
            const wrapper = document.createElement('div');
            wrapper.className = 'checkbox-item';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `group_${group.id}`;
            input.name = 'groups[]';
            input.value = group.id;
            const label = document.createElement('label');
            label.htmlFor = input.id;
            label.textContent = group.name;
            wrapper.appendChild(input);
            wrapper.appendChild(label);
            groupsContainer.appendChild(wrapper);
        });
    } catch (err) {
        console.error(err);
        groupsContainer.innerHTML = '<div>Unable to load groups.</div>';
    }
}

// Call immediately
loadFormGroups();

// Helper: show alert
// function showAlert(type, text) {
//     alertsContainer.innerHTML = `<div class="alert ${type === 'success' ? 'alert-success' : 'alert-error'}">${text}</div>`;
//     // auto-hide after 6s
//     setTimeout(()=> { if (alertsContainer.firstChild) alertsContainer.removeChild(alertsContainer.firstChild); }, 6000);
// }

// --- CHANGED: submit via fetch to API endpoint ---
incomeForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const amount = parseRupiah(totalAmountInput.value);
    if (amount <= 0) {
        alert('Please enter a valid amount');
        return false;
    }

    // prepare payload
    const formData = new FormData(incomeForm);
    // collect groups manually
    const selectedGroups = [];
    formData.getAll('groups[]').forEach(g => { if (g) selectedGroups.push(parseInt(g)); });

    const payload = {
        user_id: CURRENT_USER_ID, // CHANGED: frontend sends user_id; in production you'd use real auth
        income_name: formData.get('income_name'),
        income_date: formData.get('income_date'),
        amount: amount,
        payment_method: formData.get('payment_method'),
        groups: selectedGroups
    };

    try {
        const res = await fetch(`${INCOME_API_URL}/api/add_income.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            credentials: 'omit'
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Server error');
        }

        const data = await res.json();
        if (data.success) {
            alert('Income added successfully!'); // ← UBAH: Pakai browser alert
            incomeForm.reset();
            totalAmountInput.value = 'Rp 0';
            amountHidden.value = '';
            // reload groups if needed
            loadFormGroups();
        } else {
            alert(data.message || 'Failed to add income'); // ← UBAH: Pakai browser alert
        }
    } catch (err) {
        console.error(err);
        alert('Error: ' + (err.message || 'Unknown error'));
    }
});
