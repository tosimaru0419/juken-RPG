document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const button = document.getElementById("login-button");
  const error = document.getElementById("login-error");

  console.log("PHASE 1 TEST: JS起動");

  if (!form) {
    alert("login-form が見つかりません");
    return;
  }

  if (!button) {
    alert("login-button が見つかりません");
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    console.log("LOGIN FORM EVENT");

    if (error) {
      error.textContent = "ログインボタンの処理は正常に動いています。";
    }

    button.textContent = "TEST成功";
  });
});
