import {
  users,
  influencerPreferences,
  inquiries,
  messages,
  type User,
  type UpsertUser,
  type InfluencerPreferences,
  type InsertInfluencerPreferences,
  type Inquiry,
  type InsertInquiry,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUsername(userId: string, username: string): Promise<User>;
  
  // Influencer preferences
  getInfluencerPreferences(userId: string): Promise<InfluencerPreferences | undefined>;
  upsertInfluencerPreferences(prefs: InsertInfluencerPreferences): Promise<InfluencerPreferences>;
  
  // Inquiries
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getInquiriesByInfluencer(influencerId: string): Promise<Inquiry[]>;
  getInquiry(id: string): Promise<Inquiry | undefined>;
  updateInquiryStatus(id: string, status: "pending" | "approved" | "rejected" | "needs_info", aiResponse?: string): Promise<Inquiry>;
  closeInquiryChat(id: string, aiRecommendation: string): Promise<Inquiry>;
  deleteInquiry(id: string): Promise<void>;
  
  // Messages
  getMessagesByInquiry(inquiryId: string): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUsername(userId: string, username: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ username, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Influencer preferences
  async getInfluencerPreferences(userId: string): Promise<InfluencerPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(influencerPreferences)
      .where(eq(influencerPreferences.userId, userId));
    return prefs;
  }

  async upsertInfluencerPreferences(prefs: InsertInfluencerPreferences): Promise<InfluencerPreferences> {
    const [result] = await db
      .insert(influencerPreferences)
      .values(prefs)
      .onConflictDoUpdate({
        target: influencerPreferences.userId,
        set: {
          ...prefs,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Inquiries
  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [result] = await db.insert(inquiries).values(inquiry).returning();
    return result;
  }

  async getInquiriesByInfluencer(influencerId: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.influencerId, influencerId))
      .orderBy(desc(inquiries.createdAt));
  }

  async getInquiry(id: string): Promise<Inquiry | undefined> {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    return inquiry;
  }

  async updateInquiryStatus(
    id: string,
    status: "pending" | "approved" | "rejected" | "needs_info",
    aiResponse?: string
  ): Promise<Inquiry> {
    const [result] = await db
      .update(inquiries)
      .set({ status, aiResponse, updatedAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning();
    return result;
  }

  async closeInquiryChat(id: string, aiRecommendation: string): Promise<Inquiry> {
    const [result] = await db
      .update(inquiries)
      .set({ chatActive: false, aiRecommendation, updatedAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning();
    return result;
  }

  async deleteInquiry(id: string): Promise<void> {
    await db.delete(inquiries).where(eq(inquiries.id, id));
  }

  // Messages
  async getMessagesByInquiry(inquiryId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.inquiryId, inquiryId))
      .orderBy(messages.createdAt);
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const [result] = await db.insert(messages).values(message).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
