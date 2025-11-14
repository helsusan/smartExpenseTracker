document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('add-participant-btn');
    const emailInput = document.getElementById('invite-email');
    const participantsList = document.getElementById('participants-list');
    const hiddenInput = document.getElementById('participants-hidden-input');
    const dataList = document.getElementById('user-emails');

    let invitedEmails = [];
    let lastSelectedEmail = "";

    if (addBtn && emailInput && participantsList && hiddenInput) {

        emailInput.addEventListener('input', (e) => {
            lastSelectedEmail = e.target.value.trim().toLowerCase();
        });

        addBtn.addEventListener('click', () => {
            const email = (emailInput.value.trim() || lastSelectedEmail).toLowerCase();

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }

            if (invitedEmails.includes(email)) {
                alert('This email is already in the invitation list.');
                return;
            }

            invitedEmails.push(email);

            const newParticipant = document.createElement('p');
            newParticipant.textContent = email;

            const removeBtn = document.createElement('span');
            removeBtn.textContent = ' ×';
            removeBtn.style.color = '#b91c1c';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.marginLeft = '8px';
            
            removeBtn.addEventListener('click', () => {
                invitedEmails = invitedEmails.filter(e => e !== email);
                newParticipant.remove();
                updateHiddenInput();
                if (dataList) restoreToDatalist(email);
            });

            newParticipant.appendChild(removeBtn);
            participantsList.appendChild(newParticipant);

            updateHiddenInput();

            if (dataList) removeFromDatalist(email);

            emailInput.value = '';
            lastSelectedEmail = '';
        });

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
    }
});
