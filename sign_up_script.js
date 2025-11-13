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
    
    const signupForm = document.getElementById('signup-form');

    if (signupForm) {
        signupForm.addEventListener('submit', (event) => {
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;

            if (password !== confirmPassword) {
                event.preventDefault(); 
                alert('Error: Password and Confirm Password do not match!');
            }
        });
    }
});