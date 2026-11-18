const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CUTOFF_HOUR = 22;
const CUTOFF_MINUTE = 40;

export interface EarningWindow {
  start: Date;
  end: Date;
}

export const getCurrentEarningWindow = (now = new Date()): EarningWindow => {
  const indiaNow = new Date(now.getTime() + INDIA_OFFSET_MS);
  const todayCutoff = Date.UTC(
    indiaNow.getUTCFullYear(),
    indiaNow.getUTCMonth(),
    indiaNow.getUTCDate(),
    CUTOFF_HOUR,
    CUTOFF_MINUTE,
  ) - INDIA_OFFSET_MS;
  const end = new Date(now.getTime() < todayCutoff ? todayCutoff : todayCutoff + DAY_MS);

  return {
    start: new Date(end.getTime() - DAY_MS),
    end,
  };
};

export const getWindowFromStart = (start: Date): EarningWindow => ({
  start,
  end: new Date(start.getTime() + DAY_MS),
});

export const isValidWindowStart = (start: Date): boolean => {
  const indiaStart = new Date(start.getTime() + INDIA_OFFSET_MS);
  return indiaStart.getUTCHours() === CUTOFF_HOUR
    && indiaStart.getUTCMinutes() === CUTOFF_MINUTE
    && indiaStart.getUTCSeconds() === 0
    && indiaStart.getUTCMilliseconds() === 0;
};

export const roundMoney = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

export const formatWindowForLabel = (window: EarningWindow) => ({
  start: window.start.toISOString(),
  end: window.end.toISOString(),
});
