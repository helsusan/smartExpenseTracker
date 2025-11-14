document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    const toggleBtn = document.getElementById('toggle-btn') || document.getElementById('hamburger-btn');
    
    const toggleIcon = toggleBtn ? toggleBtn.querySelector('.material-icons, .material-icons-outlined') : null;

    function toggleSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');

            if (toggleIcon) {
                toggleIcon.textContent = sidebar.classList.contains('open') ? 'close' : 'menu';
            }
        }
    }

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);
    }
});
