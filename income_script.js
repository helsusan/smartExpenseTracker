// Format currency input
const totalAmountInput = document.getElementById('totalAmount');
const amountHidden = document.getElementById('amountHidden');

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

// Before form submit, convert Rupiah to number
document.getElementById('incomeForm').addEventListener('submit', function(e) {
    const amount = parseRupiah(totalAmountInput.value);

    // Validasi amount tidak boleh 0 atau kosong
    if (amount <= 0) {
        e.preventDefault();
        alert('Please enter a valid amount');
        return false;
    }

    // Set nilai numeric ke hidden field
    amountHidden.value = amount;
    totalAmountInput.value = amount;    
});