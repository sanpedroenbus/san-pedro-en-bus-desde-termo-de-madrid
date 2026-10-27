import type { Route } from "./routes";

// Authorized service for Ruta 50, transcribed from the Consejo de Transporte
// Público record CTP-DT-DAC-CONS-1105-2026 (issued 17 Sep 2026; schedules
// approved in session 30-2023). Only routes with a schedule in that document
// are listed; the rest of ROUTES have no official data here.
export const AUTHORIZED_SERVICE_SOURCE = {
  documentId: "CTP-DT-DAC-CONS-1105-2026",
  issuedOn: "2026-09-17",
  pdfPath: "/CTP-DT-DAC-CONS-1105-2026.pdf",
  pdfSizeMb: 2.1,
  permitExpiresOn: "2029-08-28",
  authorizedFleet: 46,
} as const;

export const DAY_TYPES = ["weekday", "saturday", "sunday"] as const;
export type DayType = (typeof DAY_TYPES)[number];

// Minutes between departures for each hour from 04:00 to 22:00 (index 0 =
// 04:00-04:59, index 18 = 22:00-22:59). 0 = no frequency set that hour. No
// route runs 23:00-03:59. "fromSanJose" is the document's sentido 1-2.
export const SCHEDULE_FIRST_HOUR = 4;
type HourlyFrequencies = readonly number[];
export type DirectionSchedule = { fromSanJose: HourlyFrequencies; toSanJose: HourlyFrequencies };
export type AuthorizedRouteService = { fleet: number; schedule: Partial<Record<DayType, DirectionSchedule>> };

const HOURLY_60 = (from: number, to: number) =>
  Array.from({ length: 19 }, (_, index) => (index + SCHEDULE_FIRST_HOUR >= from && index + SCHEDULE_FIRST_HOUR <= to ? 60 : 0));

export const AUTHORIZED_SERVICE: Partial<Record<Route, AuthorizedRouteService>> = {
  SALITRILLOS: {
    fleet: 8,
    schedule: {
      weekday: {
        fromSanJose: [0, 15, 10, 12, 15, 15, 15, 15, 15, 15, 15, 12, 12, 12, 15, 20, 20, 20, 30],
        toSanJose: [30, 15, 15, 15, 12, 12, 15, 15, 15, 15, 15, 12, 12, 12, 15, 20, 20, 20, 30],
      },
      saturday: {
        fromSanJose: [0, 20, 20, 20, 15, 15, 20, 20, 20, 20, 20, 15, 20, 20, 20, 20, 20, 20, 30],
        toSanJose: [30, 20, 20, 20, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 60],
      },
      sunday: {
        fromSanJose: [0, 60, 30, 30, 30, 30, 20, 20, 20, 15, 20, 20, 20, 20, 20, 20, 30, 20, 30],
        toSanJose: [0, 30, 30, 30, 30, 20, 20, 20, 20, 15, 20, 20, 15, 20, 20, 30, 20, 30, 60],
      },
    },
  },
  LA_EUROPA: {
    fleet: 1,
    schedule: {
      weekday: {
        fromSanJose: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 60, 60, 0, 0, 0, 0],
        toSanJose: [0, 60, 60, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    },
  },
  GRANADILLA: {
    fleet: 14,
    schedule: {
      weekday: {
        fromSanJose: [20, 10, 6, 8, 9, 9, 10, 10, 10, 10, 10, 10, 8, 8, 9, 12, 15, 15, 20],
        toSanJose: [15, 9, 6, 8, 8, 8, 10, 10, 10, 10, 10, 9, 8, 8, 10, 10, 15, 15, 30],
      },
      saturday: {
        fromSanJose: [60, 20, 15, 15, 12, 15, 15, 15, 15, 15, 10, 9, 12, 12, 12, 12, 20, 20, 20],
        toSanJose: [20, 15, 15, 12, 15, 15, 15, 15, 15, 12, 10, 12, 12, 12, 12, 15, 15, 20, 60],
      },
      sunday: {
        fromSanJose: [0, 30, 20, 15, 20, 20, 15, 15, 20, 12, 15, 10, 15, 15, 15, 12, 20, 20, 30],
        toSanJose: [60, 20, 15, 20, 20, 15, 15, 15, 12, 15, 12, 12, 15, 15, 12, 15, 15, 30, 60],
      },
    },
  },
  SAN_RAMON: {
    fleet: 10,
    schedule: {
      weekday: {
        fromSanJose: [0, 15, 10, 10, 15, 15, 15, 15, 15, 15, 15, 12, 10, 10, 12, 15, 20, 30, 30],
        toSanJose: [15, 12, 10, 12, 12, 15, 15, 15, 15, 15, 15, 12, 10, 12, 15, 20, 30, 30, 60],
      },
      saturday: {
        fromSanJose: [0, 20, 20, 15, 15, 20, 15, 20, 20, 15, 20, 20, 15, 20, 20, 20, 20, 20, 20],
        toSanJose: [60, 15, 15, 15, 15, 15, 20, 20, 15, 20, 20, 15, 20, 20, 20, 20, 20, 20, 60],
      },
      sunday: {
        fromSanJose: [0, 60, 30, 30, 20, 20, 20, 20, 20, 20, 15, 20, 15, 15, 20, 15, 20, 20, 30],
        toSanJose: [0, 30, 30, 20, 20, 20, 20, 20, 15, 20, 20, 12, 15, 20, 15, 20, 20, 30, 60],
      },
    },
  },
  LA_CAMPINA: {
    fleet: 2,
    schedule: {
      weekday: { fromSanJose: HOURLY_60(5, 22), toSanJose: HOURLY_60(4, 21) },
      saturday: {
        fromSanJose: [0, 60, 60, 60, 60, 60, 60, 60, 0, 60, 60, 60, 60, 60, 60, 60, 0, 0, 0],
        toSanJose: [60, 60, 60, 60, 60, 60, 60, 0, 60, 60, 60, 60, 60, 60, 60, 0, 0, 0, 0],
      },
      sunday: {
        fromSanJose: [0, 0, 60, 60, 60, 0, 60, 60, 60, 0, 60, 60, 60, 60, 60, 60, 0, 0, 0],
        toSanJose: [0, 0, 60, 60, 60, 60, 60, 60, 60, 0, 60, 60, 60, 60, 60, 0, 0, 0, 0],
      },
    },
  },
  SABANILLA: {
    fleet: 9,
    schedule: {
      weekday: {
        fromSanJose: [0, 12, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 10, 12, 15, 20, 30, 30],
        toSanJose: [30, 12, 9, 9, 10, 10, 10, 10, 10, 10, 10, 9, 9, 10, 12, 20, 20, 20, 60],
      },
      saturday: {
        fromSanJose: [0, 20, 15, 12, 12, 12, 15, 15, 15, 12, 12, 12, 12, 12, 12, 15, 20, 30, 30],
        toSanJose: [60, 20, 12, 12, 12, 12, 15, 15, 12, 12, 12, 12, 12, 12, 15, 20, 20, 30, 60],
      },
      sunday: {
        fromSanJose: [0, 60, 60, 30, 30, 30, 30, 20, 20, 30, 30, 20, 20, 20, 30, 30, 30, 30, 30],
        toSanJose: [0, 30, 30, 30, 30, 30, 20, 20, 30, 30, 20, 20, 30, 30, 30, 30, 30, 30, 60],
      },
    },
  },
};

export type FrequencySummary = { minMinutes: number; maxMinutes: number; averageMinutes: number; hasGaps: boolean };

// True when a direction has an hour without service between its first and last
// departure, or runs less than half the day (La Europa: 3 rush-hour trips), so
// "every 60 min" isn't read as all-day service.
function hasServiceGaps(hourly: HourlyFrequencies) {
  const serviceHours = hourly.filter((minutes) => minutes > 0).length;
  if (serviceHours === 0) return false;
  const first = hourly.findIndex((minutes) => minutes > 0);
  const last = hourly.findLastIndex((minutes) => minutes > 0);
  return last - first + 1 > serviceHours || serviceHours < hourly.length / 2;
}

// Plain mean of the hourly frequencies across both directions, over the hours
// that have service -- not weighted by trips, matching the app's plain counting.
export function summarizeFrequencies(schedule: DirectionSchedule | undefined): FrequencySummary | null {
  const values = schedule ? [...schedule.fromSanJose, ...schedule.toSanJose].filter((minutes) => minutes > 0) : [];
  if (values.length === 0) return null;
  return {
    minMinutes: Math.min(...values),
    maxMinutes: Math.max(...values),
    averageMinutes: Math.round(values.reduce((sum, minutes) => sum + minutes, 0) / values.length),
    hasGaps: hasServiceGaps(schedule!.fromSanJose) || hasServiceGaps(schedule!.toSanJose),
  };
}
