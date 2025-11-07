document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('add-participant-btn');
    const emailInput = document.getElementById('invite-email');
    const participantsList = document.getElementById('participants-list');
    const hiddenInput = document.getElementById('participants-hidden-input');
    const dataList = document.getElementById('user-emails');

    let invitedEmails = [];
    let lastSelectedEmail = "";

    emailInput.addEventListener('input', (e) => {
        lastSelectedEmail = e.target.value.trim().toLowerCase();
    });

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const email = (emailInput.value.trim() || lastSelectedEmail).toLowerCase();

            // Validasi regex yang lebih aman
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('Silakan masukkan alamat email yang valid.');
                return;
            }

            // Cegah duplikat
            if (invitedEmails.includes(email)) {
                alert('Email ini sudah ada di daftar undangan.');
                return;
            }

            // Tambahkan email ke array
            invitedEmails.push(email);

            // Buat elemen participant
            const newParticipant = document.createElement('p');
            newParticipant.textContent = email;

            // Tombol hapus (×)
            const removeBtn = document.createElement('span');
            removeBtn.textContent = ' ×';
            removeBtn.style.color = '#b91c1c';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.marginLeft = '8px';
            removeBtn.addEventListener('click', () => {
                invitedEmails = invitedEmails.filter(e => e !== email);
                newParticipant.remove();
                updateHiddenInput();
                restoreToDatalist(email);
            });

            newParticipant.appendChild(removeBtn);
            participantsList.appendChild(newParticipant);

            // Update hidden input
            updateHiddenInput();

            // Hapus email dari datalist (agar tak muncul lagi)
            removeFromDatalist(email);

            // Reset input
            emailInput.value = '';
            lastSelectedEmail = '';
        });
    }


    function updateHiddenInput() {
        hiddenInput.value = invitedEmails.join(',');
    }


    function removeFromDatalist(email) {
        for (let option of dataList.options) {
            if (option.value.toLowerCase() === email) {
                option.remove();
                break;
            }
        }
    }


    function restoreToDatalist(email) {
        const newOption = document.createElement('option');
        newOption.value = email;
        dataList.appendChild(newOption);
    }


    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('hamburger-btn');
    const toggleIcon = toggleBtn ? toggleBtn.querySelector('.material-icons-outlined') : null;

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
        if (toggleIcon) {
            toggleIcon.textContent = sidebar.classList.contains('open') ? 'close' : 'menu';
        }
    }

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    }
});
