import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// A simple key/value store for user-supplied API credentials (SoundCloud,
// Audiomack, Spotify, etc). Values are stored server-side only and are never
// echoed back in full to the frontend — only a masked preview + "configured"
// flag is ever returned.
export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settingsTable).omit({ updatedAt: true });

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settingsTable.$inferSelect;

// Known credential keys the app understands.
export const SETTINGS_KEYS = [
  "soundcloudClientId",
  "audiomackApiKey",
  "audiomackApiSecret",
  "spotifyClientId",
  "spotifyClientSecret",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];
