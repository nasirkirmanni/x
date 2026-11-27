/* ==========================================================================
   Nightly Cal.com rule: tomorrow only offers one call, at 10 PM.

   The booking rule for aezmo.com/#book is:
   - today: nothing (Cal.com's 24-hour minimum notice on both links does this);
   - tomorrow: one slot only, 10:00 PM in the schedule's time zone (India);
   - every later day: the normal weekly hours;
   - Sunday: off.
   Cal.com cannot express "tomorrow only" on its own, so Vercel runs this every
   night between 10:30 and 11:30 PM India time (vercel.json, "crons"). It gives the
   date that is about to become tomorrow a date override of 22:00 to 22:30, and
   makes sure tomorrow still has it. Any override of your own on those dates (a
   day off, other hours) is left exactly as it is, and so is every other date.
   Running it early only makes the next day stricter for an hour or so; it never
   opens more time. Calling it again does nothing new, so it is safe to open
   aezmo.com/api/cal-tomorrow by hand to run it.

   Needs CAL_API_KEY (a Cal.com API key) in the Vercel project's environment
   variables. If CRON_SECRET is set there too, only Vercel's scheduler can run it.
   The slot is 30 minutes long because both calls are; change SLOT if that changes.
   ========================================================================== */
'use strict';

const API = 'https://api.cal.com/v2';
const API_VERSION = '2024-06-11';
const SLOT = { startTime: '22:00', endTime: '22:30' };
const LATE_HOUR = 22;              // from 10 PM, also prepare the day after tomorrow
const FALLBACK_TZ = 'Asia/Kolkata';

// Today's date (YYYY-MM-DD) and the hour, as they are now in the given time zone.
function localNow(now, timeZone) {
  const parts = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).forEach((p) => { parts[p.type] = p.value; });
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const isSunday = (date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0;

// The dates that must offer only the 10 PM slot right now: tomorrow, and late in
// the evening also the day after, which becomes tomorrow at midnight. Never a Sunday.
function targets(now, timeZone) {
  const { date, hour } = localNow(now, timeZone);
  const dates = [addDays(date, 1)];
  if (hour >= LATE_HOUR) dates.push(addDays(date, 2));
  return dates.filter((d) => !isSunday(d));
}

// The schedule's overrides with the 10 PM slot added on each target date that has
// no override yet. Dates that already carry one are reported, never changed.
function merge(overrides, dates) {
  const next = overrides.map(({ date, startTime, endTime }) => ({ date, startTime, endTime }));
  const set = [], already = [], kept = [];
  dates.forEach((date) => {
    const onDate = next.filter((o) => o.date === date);
    if (!onDate.length) {
      next.push({ date, ...SLOT });
      set.push(date);
    } else if (onDate.length === 1 && onDate[0].startTime === SLOT.startTime && onDate[0].endTime === SLOT.endTime) {
      already.push(date);
    } else {
      kept.push(date);
    }
  });
  return { overrides: next, set, already, kept };
}

async function cal(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.CAL_API_KEY}`,
      'cal-api-version': API_VERSION,
      'Content-Type': 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== 'success') {
    const why = (body.error && (body.error.message || body.error.code)) || body.message || res.statusText;
    throw new Error(`Cal.com ${init.method || 'GET'} ${path} failed: ${res.status} ${why}`);
  }
  return body.data;
}

async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'Not allowed.' });
  }
  if (!process.env.CAL_API_KEY) {
    return res.status(500).json({ ok: false, error: 'CAL_API_KEY is not set in the Vercel project.' });
  }
  try {
    const schedule = await cal('/schedules/default');
    if (!schedule || !schedule.id) throw new Error('Cal.com returned no default schedule.');
    const timeZone = schedule.timeZone || FALLBACK_TZ;
    const dates = targets(new Date(), timeZone);
    const { overrides, set, already, kept } = merge(schedule.overrides || [], dates);
    if (set.length) {
      await cal(`/schedules/${schedule.id}`, { method: 'PATCH', body: JSON.stringify({ overrides }) });
    }
    const result = { ok: true, timeZone, checked: dates, set, already, kept };
    console.log(JSON.stringify(result));
    return res.status(200).json(result);
  } catch (err) {
    console.error(err.message);
    return res.status(502).json({ ok: false, error: err.message });
  }
}

module.exports = handler;
module.exports.targets = targets;
module.exports.merge = merge;
