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

// --- Pro insights: a year of history at a glance

function focusInsights(history, now = new Date()) {
  const entries = Array.isArray(history) ? history : [];
  const minutesByDay = new Map();
  const completedDays = new Set();
  const hours = new Array(24).fill(0);
  const tasks = new Map();
  let totalSeconds = 0;
  let completed = 0;

  entries.forEach((entry) => {
    const seconds = Number(entry.actualSeconds) || 0;
    const end = new Date(entry.timestamp);
    const start = new Date(end.getTime() - seconds * 1000);
    const key = dayKey(start);
    totalSeconds += seconds;
    minutesByDay.set(key, (minutesByDay.get(key) || 0) + seconds / 60);
    hours[start.getHours()] += seconds / 60;
    if (entry.completed) {
      completed += 1;
      completedDays.add(key);
    }
    const name = (entry.task || "Untitled focus").trim();
    const task = tasks.get(name) || { name, minutes: 0, sessions: 0 };
    task.minutes += seconds / 60;
    task.sessions += 1;
    tasks.set(name, task);
  });

  // 53 week columns ending this week; weeks start on Monday.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstDay = new Date(today);
  firstDay.setDate(firstDay.getDate() - ((today.getDay() + 6) % 7) - 52 * 7);
  const weeks = [];
  for (let week = 0; week < 53; week += 1) {
    const days = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + week * 7 + weekday);
      days.push(date > today ? null : { date, minutes: Math.round(minutesByDay.get(dayKey(date)) || 0) });
    }
    weeks.push(days);
  }

  // Longest run of consecutive days with a finished session.
  let longestStreak = 0;
  let run = 0;
  const cursor = new Date(firstDay);
  while (cursor <= today) {
    run = completedDays.has(dayKey(cursor)) ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
    cursor.setDate(cursor.getDate() + 1);
  }

  const roundedHours = hours.map((minutes) => Math.round(minutes));
  const peak = roundedHours.indexOf(Math.max(...roundedHours));
  return {
    totalMinutes: Math.round(totalSeconds / 60),
    sessions: entries.length,
    completed,
    completionRate: entries.length ? Math.round((completed / entries.length) * 100) : 0,
    longestStreak,
    weeks,
    hours: roundedHours,
    peakHour: roundedHours[peak] > 0 ? peak : null,
    topTasks: [...tasks.values()]
      .map((task) => ({ ...task, minutes: Math.round(task.minutes) }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 8),
  };
}

function historyToCsv(history) {
  // A leading = + - or @ would run as a formula in spreadsheet apps, so it gets a ' first.
  const cell = (value) => {
    const text = String(value ?? "");
    return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const pad = (number) => String(number).padStart(2, "0");
  const rows = (Array.isArray(history) ? history : []).map((entry) => {
    const end = new Date(entry.timestamp);
    const start = new Date(end.getTime() - (Number(entry.actualSeconds) || 0) * 1000);
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    const time = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return [date, time(start), time(end), entry.task, entry.plannedMinutes,
      Math.round((Number(entry.actualSeconds) || 0) / 60), entry.completed ? "yes" : "no"].map(cell).join(",");
  });
  return [["Date", "Start", "End", "Task", "Planned minutes", "Focused minutes", "Completed"].map(cell).join(","), ...rows].join("\r\n");
}
