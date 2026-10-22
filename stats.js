// Focus statistics from the saved focus history, shared by the dashboard and the toolbar popup.

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function focusStats(history, now = new Date()) {
  const minutesByDay = new Map();
  const completedDays = new Set();
  (Array.isArray(history) ? history : []).forEach((entry) => {
    const key = dayKey(new Date(entry.timestamp));
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + (Number(entry.actualSeconds) || 0) / 60);
    if (entry.completed) completedDays.add(key);
  });

  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    days.push({
      date,
      label: date.toLocaleDateString([], { weekday: "narrow" }),
      minutes: Math.round(minutesByDay.get(dayKey(date)) || 0),
    });
  }

  // A streak counts consecutive days with at least one finished session. Today
  // without one yet doesn't break it; the count starts from yesterday instead.
  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!completedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (completedDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    todayMinutes: days[6].minutes,
    weekMinutes: days.reduce((sum, day) => sum + day.minutes, 0),
    days,
    streak,
  };
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
