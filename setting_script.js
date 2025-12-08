/* =========================================
   CONFIG
========================================= */
// const API_BASE_URL = "https://ysws5lx0nb.execute-api.us-east-1.amazonaws.com/prod";

const USER_ID = localStorage.getItem("user_id");
const USER_NAME = localStorage.getItem("user_name");
const USER_EMAIL = localStorage.getItem("user_email");
const USER_BUDGET = localStorage.getItem("user_budget");

/* =========================================
   ALERT UI
========================================= */
function showAlert(type, message) {
  const alertBox = document.getElementById("alerts");
  alertBox.innerHTML = `
    <div class="alert-box alert-${type}">
      <span class="material-icons-outlined">${type === "success" ? "check_circle" : "error"}</span>
      <span>${message}</span>
      <span class="alert-close" onclick="this.parentElement.remove()">×</span>
    </div>
  `;
}

/* =========================================
   LOAD INITIAL DATA
========================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (USER_NAME) {
    document.getElementById("welcomeText").textContent = `Settings - ${USER_NAME}`;
  }

  document.getElementById("current-email").value = USER_EMAIL || "-";
  document.getElementById("current-budget").value =
    USER_BUDGET ? `${Number(USER_BUDGET).toLocaleString()}` : "Not set";

  initUpdateBudgetForm();
});

/* =========================================
   UPDATE BUDGET FORM
========================================= */
function initUpdateBudgetForm() {
  const form = document.getElementById("updateBudgetForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newBudget = document.getElementById("new-budget").value;

    if (newBudget < 0) {
      showAlert("error", "Budget cannot be negative.");
      return;
    }

    const payload = {
      userId: USER_ID,
      new_budget: newBudget
    };

    const submitBtn = form.querySelector(".submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    try {
      const res = await fetch(`${API_BASE_URL}/setting-api/updateBudget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        showAlert("success", "Budget updated successfully!");

        // Update local storage
        localStorage.setItem("user_budget", newBudget);

        document.getElementById("current-budget").value =
          `Rp ${Number(newBudget).toLocaleString()}`;

        form.reset();
      } else {
        showAlert("error", result.error || "Failed to update budget.");
      }
    } catch (err) {
      showAlert("error", "Network error: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Update Budget";
    }
  });
}
