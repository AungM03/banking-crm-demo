const testUserSelect = document.querySelector("#testUserSelect");
const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const loginError = document.querySelector("#loginError");

testUserSelect.addEventListener("change", () => {
  fillSelectedUser();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.classList.add("hidden");

  try {
    const session = await window.crmApi.login({
      email: emailInput.value,
      password: passwordInput.value
    });

    window.crmSetSession(session);
    window.location.href = session.user.page;
  } catch (error) {
    loginError.textContent = error.message || "Login failed. Check the test email and password.";
    loginError.classList.remove("hidden");
  }
});

fillSelectedUser();

function fillSelectedUser() {
  const user = window.crmLoginUsers.find((loginUser) => loginUser.email === testUserSelect.value);

  if (!user) {
    return;
  }

  emailInput.value = user.email;
  passwordInput.value = "";
  passwordInput.focus();
  loginError.classList.add("hidden");
}
