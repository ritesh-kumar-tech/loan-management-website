export type DateRangeBounds = { start: Date | null; end: Date };

/**
 * Resolves an admin date-range filter key (as shown in the header selector)
 * to concrete bounds. `start: null` means unbounded (all-time).
 */
export function getDateRangeBounds(range: string, customStart?: string, customEnd?: string): DateRangeBounds {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (range) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
    case 'last_7_days':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), end };
    case 'last_30_days':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), end };
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case 'last_3_months':
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), end };
    case 'last_6_months':
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()), end };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case 'custom': {
      const start = customStart ? new Date(customStart) : null;
      const customEndDate = customEnd ? new Date(customEnd) : null;
      return {
        start,
        end: customEndDate ? new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59, 999) : end,
      };
    }
    default:
      return { start: null, end };
  }
}

export function isWithinRange(dateValue: string | undefined, bounds: DateRangeBounds): boolean {
  if (!dateValue) return false;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return false;
  if (bounds.start && time < bounds.start.getTime()) return false;
  if (time > bounds.end.getTime()) return false;
  return true;
}

export const DATE_RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  this_year: 'This Year',
  custom: 'Custom Range',
};
