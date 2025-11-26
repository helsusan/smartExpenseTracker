const API_BASE_URL = "https://REPLACE_WITH_YOUR_API.execute-api.ap-southeast-1.amazonaws.com/prod";

function moveEyes(event) {
    const pupils = document.querySelectorAll('.pupil');

    pupils.forEach(pupil => {
        const rect = pupil.getBoundingClientRect();
        const pupilX = rect.left + rect.width / 2;
        const pupilY = rect.top + rect.height / 2;

        const deltaX = event.clientX - pupilX;
        const deltaY = event.clientY - pupilY;
        const angle = Math.atan2(deltaY, deltaX);

        const moveX = Math.cos(angle) * 6;
        const moveY = Math.sin(angle) * 6;

        pupil.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
    });
}

window.addEventListener('mousemove', moveEyes);


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("signup-form");
    const errorBox = document.getElementById("error-box");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirm_password").value;
        const budget = document.getElementById("budget").value;

        if (password !== confirm) {
            errorBox.innerText = "Passwords do not match!";
            errorBox.style.display = "block";
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name, email, password, budget})
            });

            const data = await res.json();

            if (!data.success) {
                errorBox.innerText = data.message;
                errorBox.style.display = "block";
                return;
            }

            window.location.href = "login.html?success=1";

        } catch (err) {
            errorBox.innerText = "Server error";
            errorBox.style.display = "block";
        }
    });
});
