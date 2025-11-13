function moveEyes(event) {
    const pupils = document.querySelectorAll('.pupil');

    pupils.forEach(pupil => {
        const rect = pupil.getBoundingClientRect();
        const pupilX = rect.left + rect.width / 2;
        const pupilY = rect.top + rect.height / 2;
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        const deltaX = mouseX - pupilX;
        const deltaY = mouseY - pupilY;
        const angle = Math.atan2(deltaY, deltaX);

        const moveX = Math.cos(angle) * 6; 
        const moveY = Math.sin(angle) * 6; 

        pupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    });
}

window.addEventListener('mousemove', moveEyes);


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            const btn = loginForm.querySelector('.btn-primary');
            btn.textContent = 'Signing In...';
            btn.style.opacity = '0.7';
        });
    }
});