import { pgTable, text, real, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hotCueSchema = z.object({
  index: z.number(),
  position: z.number(),
  name: z.string(),
  color: z.string(),
});

export type HotCueRecord = z.infer<typeof hotCueSchema>;

// A "fingerprint" (name + size + duration) identifies the same local audio
// file across sessions without ever storing or uploading the audio itself.
export const tracksTable = pgTable("tracks", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  name: text("name").notNull(),
  artist: text("artist").notNull().default(""),
  album: text("album").notNull().default(""),
  genre: text("genre").notNull().default(""),
  duration: real("duration").notNull().default(0),
  bpm: real("bpm"),
  bpmConfidence: real("bpm_confidence").notNull().default(0),
  key: text("key"),
  camelot: text("camelot"),
  energy: real("energy").notNull().default(0),
  mood: text("mood").notNull().default("neutral"),
  danceability: real("danceability").notNull().default(0),
  loudness: real("loudness").notNull().default(0),
  albumArt: text("album_art"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  colorLabel: text("color_label"),
  hotCues: jsonb("hot_cues").notNull().default([]).$type<HotCueRecord[]>(),
  loopIn: real("loop_in"),
  loopOut: real("loop_out"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTrackSchema = createInsertSchema(tracksTable, {
  hotCues: z.array(hotCueSchema).default([]),
}).omit({ createdAt: true, updatedAt: true });

export const updateTrackSchema = insertTrackSchema.partial().omit({ id: true, fingerprint: true });

export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type UpdateTrack = z.infer<typeof updateTrackSchema>;
export type Track = typeof tracksTable.$inferSelect;
