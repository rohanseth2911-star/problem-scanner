import type { EffectiveAlertTier, Preferences } from '../shared/types.ts';
import { readPreferences, writePreferences } from './db.ts';

/**
 * Single-user preferences. Seeded once, then edited from the Settings screen.
 * There is deliberately no auth: this is one person's app.
 */
export const DEFAULT_PREFERENCES: Preferences = {
  timezone: process.env.USER_TIMEZONE ?? 'America/New_York',
  trackedTeamIds: [
    'nba-gsw',
    'nba-okc',
    'nfl-phi',
    'epl-mci',
    'atp-vasquez',
    'wta-lindqvist',
  ],
  trackedPlayerIds: [],
  subscriptions: ['NBA League Pass', 'ESPN+', 'Peacock', 'Netflix'],
  watchWindows: [
    { day: 0, startHour: 9, endHour: 24 },
    { day: 1, startHour: 18, endHour: 24 },
    { day: 2, startHour: 18, endHour: 24 },
    { day: 3, startHour: 18, endHour: 24 },
    { day: 4, startHour: 18, endHour: 24 },
    { day: 5, startHour: 18, endHour: 24 },
    { day: 6, startHour: 9, endHour: 24 },
  ],
  alertTiers: {},
  defaultAlertTier: 'key',
  dropEverythingThreshold: 80,
};

export function getPreferences(): Preferences {
  const stored = readPreferences<Preferences>();
  if (!stored) {
    writePreferences(DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  }
  // Merge forward so a new field never breaks an existing database.
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export function savePreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  writePreferences(next);
  return next;
}

export function alertTierFor(prefs: Preferences, teamIds: string[]): EffectiveAlertTier {
  const order = ['off', 'final', 'clutch', 'key', 'all'] as const;
  // When both sides are tracked, the more talkative tier wins.
  let best: (typeof order)[number] = 'off';
  let matched = false;
  for (const id of teamIds) {
    const tier = prefs.alertTiers[id];
    if (tier) {
      matched = true;
      if (order.indexOf(tier) > order.indexOf(best)) best = tier;
    } else if (prefs.trackedTeamIds.includes(id)) {
      matched = true;
      if (order.indexOf(prefs.defaultAlertTier) > order.indexOf(best)) best = prefs.defaultAlertTier;
    }
  }
  // No opinion expressed about either side: stay silent, but leave the
  // drop-everything path open so a great game can still find you.
  return matched ? best : 'discover';
}
