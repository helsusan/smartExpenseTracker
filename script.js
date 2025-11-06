document.addEventListener('DOMContentLoaded', () => {

    const addBtn = document.getElementById('add-participant-btn');
    const emailInput = document.getElementById('invite-email');
    const participantsList = document.getElementById('participants-list');
    const hiddenInput = document.getElementById('participants-hidden-input');

    let invitedEmails = [];

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const email = emailInput.value.trim();

            // Validasi sederhana
            if (!email || !email.includes('@')) {
                alert('Silakan masukkan alamat email yang valid.');
                return;
            }

            // Cegah duplikat
            if (invitedEmails.includes(email)) {
                alert('Email ini sudah ada di daftar undangan.');
                return;
            }

            // Tambahkan email ke array & tampilkan
            invitedEmails.push(email);
            const newParticipant = document.createElement('p');
            newParticipant.textContent = email;

            // Tombol hapus (opsional)
            const removeBtn = document.createElement('span');
            removeBtn.textContent = ' ×';
            removeBtn.style.color = '#b91c1c';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.marginLeft = '8px';
            removeBtn.addEventListener('click', () => {
                invitedEmails = invitedEmails.filter(e => e !== email);
                newParticipant.remove();
                updateHiddenInput();
            });

            newParticipant.appendChild(removeBtn);
            participantsList.appendChild(newParticipant);
            updateHiddenInput();
            emailInput.value = '';
        });
    }

    // Update input tersembunyi agar dikirim ke PHP
    function updateHiddenInput() {
        hiddenInput.value = invitedEmails.join(',');
    }

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('hamburger-btn'); // ID dari sidebar.php
    const toggleIcon = toggleBtn ? toggleBtn.querySelector('.material-icons-outlined') : null;

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');

        // Ganti ikon menu/close
        if (toggleIcon) {
            toggleIcon.textContent = sidebar.classList.contains('open') ? 'close' : 'menu';
        }
    }

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    }
});
