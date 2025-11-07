let itemCounter = 1;
let searchTimeout;
let currentCategories = [];

// Category input handling
const categoryInput = document.getElementById('categoryInput');
const categoryDropdown = document.getElementById('categoryDropdown');
const categoryOptions = document.getElementById('categoryOptions');
const createOption = document.getElementById('createOption');
const createText = document.getElementById('createText');

categoryInput.addEventListener('focus', function() {
    searchCategories(this.value);
    categoryDropdown.classList.add('show');
});

categoryInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const value = this.value.trim();
    
    searchTimeout = setTimeout(() => {
        searchCategories(value);
    }, 300);
});

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.category-autocomplete')) {
        categoryDropdown.classList.remove('show');
    }
});

// Search categories from database
function searchCategories(query) {
    fetch('expense.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=search_categories&search=' + encodeURIComponent(query)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentCategories = data.categories;
            displayCategories(data.categories, query);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Display categories in dropdown
function displayCategories(categories, query) {
    categoryOptions.innerHTML = '';
    
    if (categories.length === 0 && !query) {
        categoryOptions.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">Start typing to search categories</div>';
        createOption.style.display = 'none';
        return;
    }

    if (categories.length > 0) {
        categories.forEach(category => {
            const option = document.createElement('div');
            option.className = 'category-option';
            option.innerHTML = `
                <span class="category-name">${category.name}</span>
                <span class="category-delete-btn" onclick="event.stopPropagation(); deleteCategory(${category.id})">🗑️</span>
            `;
            option.onclick = function(e) {
                if (!e.target.classList.contains('category-delete-btn')) {
                    selectCategory(category.name);
                }
            };
            categoryOptions.appendChild(option);
        });
    } else if (query) {
        categoryOptions.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">No categories found</div>';
    }

    // Show create option if query doesn't match any existing category
    if (query && !categories.some(cat => cat.name.toLowerCase() === query.toLowerCase())) {
        createText.textContent = query;
        createOption.style.display = 'flex';
        createOption.onclick = function() {
            selectCategory(query);
        };
    } else {
        createOption.style.display = 'none';
    }

    categoryDropdown.classList.add('show');
}

// Select category
function selectCategory(name) {
    categoryInput.value = name;
    document.getElementById('categoryNameInput').value = name;
    categoryDropdown.classList.remove('show');
}

// Delete category
function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) {
        return;
    }

    fetch('expense.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'action=delete_category&category_id=' + id
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Category deleted successfully!');
            searchCategories(categoryInput.value);
        } else {
            alert('Failed to delete category: ' + data.message);
        }
    })
    .catch(error => {
        alert('Error: ' + error);
    });
}






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
    const others = parseRupiah(document.getElementById('others').value);
            
    const total = subtotal + tax + service - discount + others;
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
        <td><button type="button" class="delete-btn" onclick="deleteRow(this)">🗑️</button></td>
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
    ['subtotal', 'tax', 'service', 'discount', 'others'].forEach(id => {
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
    ['tax', 'service', 'discount', 'others'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', function() {
            this.value = formatRupiah(this.value);
            calculateTotal();
        });
    });
});
