let itemCounter = 1;

const input = document.getElementById("dropdownInput");
const list = document.getElementById("dropdownList");
const hiddenCategoryName = document.getElementById("categoryNameInput");

let categories = [];

// Fetch categories from database (AJAX)
function loadCategories(search = "") {
    const formData = new URLSearchParams();
    formData.append("action", "search_categories");
    formData.append("search", search);

    fetch("expense_form.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                categories = data.categories;
                renderDropdown(search);
            } else {
                console.error("Failed to load categories:", data.message);
            }
        })
        .catch(err => console.error("Error:", err));
}

// Render dropdown list
function renderDropdown(filter = "") {
    list.innerHTML = "";
    const filtered = categories.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase())
    );

    // Jika tidak ada hasil dan user mengetik sesuatu, tampilkan opsi create
    if (filtered.length === 0 && filter !== "") {
        const createItem = document.createElement("div");
        createItem.classList.add("dropdown-item", "create-item");
        createItem.textContent = `+ Create "${filter}"`;
        createItem.addEventListener("click", () => selectCategory(filter, true));
        list.appendChild(createItem);
    } else {
        filtered.forEach(cat => {
            const item = document.createElement("div");
            item.classList.add("dropdown-item");

            const span = document.createElement("span");
            span.textContent = cat.name;

            item.appendChild(span);
            list.appendChild(item);
        });
    }

    list.style.display = "block";
}

// Select or create category
function selectCategory(name, isNew = false) {
    input.value = name;
    hiddenCategoryName.value = name;
    list.style.display = "none";

    if (isNew) {
        alert(`Category "${name}" will be created when you submit.`);
    }
}

// Input listeners
input.addEventListener("focus", () => loadCategories(input.value));
input.addEventListener("input", () => loadCategories(input.value));

document.addEventListener("click", e => {
    if (!e.target.closest(".dropdown-container")) {
        list.style.display = "none";
    }
});










// Format rupiah
function formatRupiah(value) {
    const number = parseInt(value.toString().replace(/[^0-9]/g, ''));
    if (isNaN(number)) return 'Rp 0';
    return 'Rp ' + number.toLocaleString('id-ID');
}

// Parse rupiah to number
function parseRupiah(value) {
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
}

// Calculate subtotal from items
function calculateSubtotal() {
    let subtotal = 0;
    const rows = document.querySelectorAll('#itemsTable tbody tr');
            
    rows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseRupiah(row.querySelector('.item-price').value);
        subtotal += quantity * price;
    });
            
    document.getElementById('subtotal').value = formatRupiah(subtotal);
    calculateTotal();
}

// Calculate total amount
function calculateTotal() {
    const subtotal = parseRupiah(document.getElementById('subtotal').value);
    const tax = parseRupiah(document.getElementById('tax').value);
    const service = parseRupiah(document.getElementById('service').value);
    const discount = parseRupiah(document.getElementById('discount').value);
            
    const total = subtotal + tax + service - discount;
    document.getElementById('totalAmount').textContent = formatRupiah(total);
    document.getElementById('grandTotalInput').value = total;
}

// Add new item row
function addItemRow() {
    const tbody = document.querySelector('#itemsTable tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" name="items[${itemCounter}][name]" placeholder="Item name" class="item-name"></td>
        <td><input type="number" name="items[${itemCounter}][quantity]" placeholder="0" class="item-quantity" step="0.01"></td>
        <td><input type="text" name="items[${itemCounter}][price]" placeholder="Rp 0" class="item-price"></td>
        <td><button type="button" class="delete-btn" onclick="deleteRow(this)"><span class="material-icons-outlined">delete</span></button></td>
    `;
    tbody.appendChild(newRow);
    itemCounter++;
            
    // Add event listeners to new row
    newRow.querySelector('.item-quantity').addEventListener('input', calculateSubtotal);
    newRow.querySelector('.item-price').addEventListener('input', function(e) {
        this.value = formatRupiah(this.value);
        calculateSubtotal();
    });
}

// Delete row
function deleteRow(btn) {
    const tbody = document.querySelector('#itemsTable tbody');
    if (tbody.querySelectorAll('tr').length > 1) {
        const row = btn.closest('tr');
        row.remove();
        calculateSubtotal();
    } else {
        alert('At least one item is required!');
    }
}

// Before form submit, convert Rupiah values to numbers
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    // Convert item prices to numbers
    document.querySelectorAll('.item-price').forEach(input => {
        input.value = parseRupiah(input.value);
    });
            
    // Convert summary values to numbers
    ['subtotal', 'tax', 'service', 'discount'].forEach(id => {
        const input = document.getElementById(id);
        input.value = parseRupiah(input.value);
    });
});

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Format rupiah inputs
    const priceInputs = document.querySelectorAll('.item-price');
    priceInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.value = formatRupiah(this.value);
            calculateSubtotal();
        });
    });

    // Quantity change listener
    const quantityInputs = document.querySelectorAll('.item-quantity');
    quantityInputs.forEach(input => {
        input.addEventListener('input', calculateSubtotal);
    });

    // Summary inputs
    ['tax', 'service', 'discount'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', function() {
            this.value = formatRupiah(this.value);
            calculateTotal();
        });
    });
});
