const params = new URLSearchParams(location.search);
const reason = params.get("reason") || "focus";
const strict = params.get("strict") === "1";

const headings = {
  focus: "This site is blocked while you focus",
  schedule: "This site is blocked right now",
  limit: "You've used today's time on this site",
};
const notes = {
  focus: strict
    ? "Strict mode is on, so it stays blocked until your focus session ends."
    : "Finish your session to get it back, or unblock now if you need it.",
  schedule: "Your blocking schedule is on. It opens up again when the schedule ends.",
  limit: "Your daily limit for this site is used up. It opens again at midnight.",
};
document.querySelector("h1").textContent = headings[reason] || headings.focus;
document.querySelector(".blocked-note").textContent = notes[reason] || notes.focus;
// "Unblock sites" only lifts a focus session's block, and never in strict mode.
document.querySelector("#blocked-unblock").hidden = reason !== "focus" || strict;

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
