// Pure date math for statement closing-date inference.
// Given a day-of-month (1..31) and a "today" anchor, returns the next calendar
// date whose day matches, snapping to end-of-month when the requested day
// exceeds the target month's length (e.g. closingDay 31 in February → 28/29).

export function nextOccurrenceOfDayInMonth(
    closingDay: number,
    fromYmd: string,
): string {
    const from = new Date(`${fromYmd}T00:00:00Z`);
    const year = from.getUTCFullYear();
    const month = from.getUTCMonth();
    const day = from.getUTCDate();

    const lastDayThisMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const candidateThisMonth = Math.min(closingDay, lastDayThisMonth);
    if (candidateThisMonth >= day) {
        return formatYmd(year, month, candidateThisMonth);
    }

    const nextMonth = month + 1;
    const lastDayNextMonth = new Date(
        Date.UTC(year, nextMonth + 1, 0),
    ).getUTCDate();
    const candidateNextMonth = Math.min(closingDay, lastDayNextMonth);
    return formatYmd(year, nextMonth, candidateNextMonth);
}

function formatYmd(
    year: number,
    monthZeroBased: number,
    day: number,
): string {
    const date = new Date(Date.UTC(year, monthZeroBased, day));
    return date.toISOString().slice(0, 10);
}
