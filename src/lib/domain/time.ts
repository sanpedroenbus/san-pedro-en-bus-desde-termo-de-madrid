export const APP_TIME_ZONE = "America/Costa_Rica";

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const zonedDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getZonedDateParts(date: Date): ZonedDateParts {
  const parts = Object.fromEntries(zonedDateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = getZonedDateParts(date);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - date.getTime();
}

// Costa Rica does not observe daylight saving time, so its UTC offset never
// changes. A single pass is enough to turn a local wall-clock time into an
// instant (Termo de Madrid's Europe/Madrid version needed a second corrective
// pass to handle DST transitions near the boundary).
export function fromLocalTime(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
) {
  const localAsUtc = Date.UTC(year, monthIndex, day, hour, minute, second, millisecond);
  return new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc)));
}

export function getLocalDateParts(date: Date) {
  const { year, month, day } = getZonedDateParts(date);
  return { year, month, day };
}

export function getLocalStartOfDay(date: Date, dayOffset = 0) {
  const { year, month, day } = getLocalDateParts(date);
  return fromLocalTime(year, month - 1, day + dayOffset);
}
