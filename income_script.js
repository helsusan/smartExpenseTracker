// Format currency input
const totalAmountInput = document.getElementById('totalAmount');

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
document.ge
tElementById('incomeForm').addEventListener('submit', function(e) {
    const amount = parseRupiah(totalAmountInput.value);
    document.getElementById('amountHidden').value = amount;
});