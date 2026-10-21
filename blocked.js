document.querySelector("#blocked-back").addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
  } else {
    window.close();
  }
});

document.querySelector("#blocked-unblock").addEventListener("click", async () => {
  // The background script remembers this for the rest of the session.
  await chrome.runtime.sendMessage({ type: "focus:unblock" });
  document.querySelector(".blocked-note").textContent = "Sites unblocked. Go back and reload the page.";
});
