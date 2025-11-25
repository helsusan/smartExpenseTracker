/* FILE: income_script.js
   CHANGED: Added API calls (get groups + submit to API).
   IMPORTANT: Set API_BASE_URL to the domain where your PHP API is hosted (https://api.example.com).
*/

const API_BASE_URL = 'https://api.example.com'; // <-- CHANGED: set this to your backend domain (no trailing slash)
const HARDCODED_USER_ID = 3; // CHANGED: previous PHP used user_id=3

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
async function loadGroups() {
    try {
        groupsContainer.innerHTML = '<div>Loading groups...</div>';
        const res = await fetch(`${API_BASE_URL}/api/get_groups.php?user_id=${HARDCODED_USER_ID}`, {
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
loadGroups();

// Helper: show alert
function showAlert(type, text) {
    alertsContainer.innerHTML = `<div class="alert ${type === 'success' ? 'alert-success' : 'alert-error'}">${text}</div>`;
    // auto-hide after 6s
    setTimeout(()=> { if (alertsContainer.firstChild) alertsContainer.removeChild(alertsContainer.firstChild); }, 6000);
}

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
        user_id: HARDCODED_USER_ID, // CHANGED: frontend sends user_id; in production you'd use real auth
        income_name: formData.get('income_name'),
        income_date: formData.get('income_date'),
        amount: amount,
        payment_method: formData.get('payment_method'),
        groups: selectedGroups
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/add_income.php`, {
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
            showAlert('success', 'Income added successfully!');
            incomeForm.reset();
            totalAmountInput.value = 'Rp 0';
            amountHidden.value = '';
            // reload groups if needed
            loadGroups();
        } else {
            showAlert('error', data.message || 'Failed to add income');
        }
    } catch (err) {
        console.error(err);
        showAlert('error', 'Error: ' + (err.message || 'Unknown error'));
    }
});
