import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  languagePreference: varchar("language_preference").notNull().default("en"),
  userType: varchar("user_type", { enum: ["influencer", "business"] }).notNull().default("influencer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Influencer preferences/instructions
export const influencerPreferences = pgTable("influencer_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }), // ✅ Added .unique()
  personalContentPreferences: text("personal_content_preferences").notNull(),
  monetaryBaseline: integer("monetary_baseline").notNull(),
  contentLength: varchar("content_length").notNull(),
  additionalGuidelines: text("additional_guidelines"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInfluencerPreferencesSchema = createInsertSchema(influencerPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInfluencerPreferences = z.infer<typeof insertInfluencerPreferencesSchema>;
export type InfluencerPreferences = typeof influencerPreferences.$inferSelect;

// Business inquiries
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  influencerId: varchar("influencer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessEmail: varchar("business_email").notNull(),
  message: text("message").notNull(),
  price: integer("price"),
  companyInfo: text("company_info"),
  attachmentUrl: varchar("attachment_url"),
  status: varchar("status", { enum: ["pending", "approved", "rejected", "needs_info"] }).notNull().default("pending"),
  chatActive: boolean("chat_active").notNull().default(true),
  aiResponse: text("ai_response"),
  aiRecommendation: text("ai_recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  status: true,
  chatActive: true,
  aiResponse: true,
  aiRecommendation: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

// Chat messages for inquiry conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inquiryId: varchar("inquiry_id").notNull().references(() => inquiries.id, { onDelete: "cascade" }),
  role: varchar("role", { enum: ["system", "user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
