// Focus Plus Pro: payment configuration and the "is Pro active?" check.
// Shared by background.js, the dashboard and the toolbar popup.

// The extension id you registered at https://extensionpay.com. While this is empty,
// payments are switched off: Pro features stay locked and the upgrade buttons say so.
const EXTPAY_ID = "";
const PRO_TRIAL_DAYS = 7;
const proStorageKey = "momentumPro";
const dayMs = 24 * 60 * 60 * 1000;

// `pro` is the status background.js caches from ExtensionPay:
// { paid, trialStartedAt, plan, subscriptionStatus, checkedAt }.
function proStatus(pro, now = Date.now()) {
  if (pro?.paid) return { active: true, kind: "paid", plan: pro.plan || null };
  if (pro?.trialStartedAt) {
    const endsAt = pro.trialStartedAt + PRO_TRIAL_DAYS * dayMs;
    if (now < endsAt) return { active: true, kind: "trial", daysLeft: Math.ceil((endsAt - now) / dayMs) };
    return { active: false, kind: "trialEnded" };
  }
  return { active: false, kind: "free" };
}

function formatPlan(plan) {
  if (!plan) return "";
  const amount = new Intl.NumberFormat([], { style: "currency", currency: plan.currency || "usd" })
    .format((plan.unitAmountCents || 0) / 100);
  if (plan.interval === "once") return `${amount} one-time`;
  return `${amount} / ${plan.intervalCount > 1 ? `${plan.intervalCount} ` : ""}${plan.interval}`;
}

// Pro accent colours (each keeps 4.5:1 contrast with the dark text on accent buttons).
const accentColors = {
  terracotta: { name: "Terracotta", hex: "#d18b68", rgb: "209 139 104" },
  ocean: { name: "Ocean", hex: "#6fa8dc", rgb: "111 168 220" },
  sage: { name: "Sage", hex: "#84bf8f", rgb: "132 191 143" },
  lavender: { name: "Lavender", hex: "#b39ae0", rgb: "179 154 224" },
  rose: { name: "Rose", hex: "#e39bb3", rgb: "227 155 179" },
  gold: { name: "Gold", hex: "#e0bb63", rgb: "224 187 99" },
};
