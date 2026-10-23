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
