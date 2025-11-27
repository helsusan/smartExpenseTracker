const API_BASE_URL = "https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod";

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
    const form = document.getElementById("login-form");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = form.querySelector(".btn-primary");
        btn.textContent = "Signing In...";
        btn.style.opacity = "0.7";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, password})
            });

            const data = await res.json();

            if (!data.success) {
                alert(data.message);
                btn.textContent = "Login";
                btn.style.opacity = "1";
                return;
            }

            localStorage.setItem("user_id", data.user.id);
            localStorage.setItem("user_name", data.user.name);
            localStorage.setItem("user_email", data.user.email);

            window.location.href = "dashboard.html";

        } catch (err) {
            alert("Network / server error");
            btn.textContent = "Login";
            btn.style.opacity = "1";
        }
    });
});
