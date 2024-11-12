chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillForm") {
    const usernameField = document.querySelector(
      'input[type="text"], input[type="email"]'
    );
    const passwordField = document.querySelector('input[type="password"]');

    if (usernameField && passwordField) {
      usernameField.value = message.credentials.username;
      passwordField.value = message.credentials.password;
      sendResponse({ status: "success" });
    } else {
      sendResponse({ status: "error" });
    }
  }
});
