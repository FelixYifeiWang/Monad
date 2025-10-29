import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isGoogleAuthConfigured } from "./googleAuth";
import { insertInfluencerPreferencesSchema, insertInquirySchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { generateInquiryResponse, generateChatResponse, generateRecommendation } from "./aiAgent";
import { upload } from "./upload";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Check auth configuration status (public endpoint)
  app.get('/api/auth/status', (req, res) => {
    res.json({ 
      configured: isGoogleAuthConfigured(),
      message: isGoogleAuthConfigured() ? "Auth configured" : "Please set up Google OAuth credentials. See GOOGLE_OAUTH_SETUP.md"
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user by username (public endpoint)
  app.get('/api/users/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only return public info
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching user by username:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update username
  app.patch('/api/auth/username', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let { username } = req.body;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }

      // Normalize username (trim and lowercase)
      username = username.trim().toLowerCase();

      // Validate username format (alphanumeric, hyphens, underscores, 3-30 chars)
      const usernameRegex = /^[a-z0-9_-]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          message: "Username must be 3-30 characters and contain only lowercase letters, numbers, hyphens, and underscores" 
        });
      }

      // Get current user to check if username is unchanged
      const currentUser = await storage.getUser(userId);
      if (currentUser) {
        if (currentUser.username === username) {
          // Username unchanged, return success without DB write
          return res.json({
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            profileImageUrl: currentUser.profileImageUrl,
          });
        }
      }

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const user = await storage.updateUsername(userId, username);
      
      // Return only necessary fields (same as /api/auth/user)
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Error updating username:", error);
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  // Influencer preferences routes
  app.get('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const prefs = await storage.getInfluencerPreferences(userId);
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validation = insertInfluencerPreferencesSchema.safeParse({
        ...req.body,
        userId,
      });

      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const prefs = await storage.upsertInfluencerPreferences(validation.data);
      res.json(prefs);
    } catch (error) {
      console.error("Error saving preferences:", error);
      res.status(500).json({ message: "Failed to save preferences" });
    }
  });

  // Inquiry routes
  app.get('/api/inquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const inquiries = await storage.getInquiriesByInfluencer(userId);
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  // Get single inquiry (public endpoint for business chat)
  app.get('/api/inquiries/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const inquiry = await storage.getInquiry(id);
      
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      
      res.json(inquiry);
    } catch (error) {
      console.error("Error fetching inquiry:", error);
      res.status(500).json({ message: "Failed to fetch inquiry" });
    }
  });

  app.post('/api/inquiries', upload.single('attachment'), async (req, res) => {
    try {
      const body = {
        ...req.body,
        price: req.body.price ? parseInt(req.body.price) : undefined,
        attachmentUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      };

      const validation = insertInquirySchema.safeParse(body);

      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const inquiry = await storage.createInquiry(validation.data);
      
      // Get influencer preferences and generate AI response
      let preferences = await storage.getInfluencerPreferences(validation.data.influencerId);
      
      // Use default preferences if none are set
      if (!preferences) {
        preferences = {
          id: "default",
          userId: validation.data.influencerId,
          personalContentPreferences: "Various collaboration opportunities",
          monetaryBaseline: 500,
          contentLength: "Flexible",
          additionalGuidelines: null,
          createdAt: null,
          updatedAt: null,
        };
      }
      
      const aiResponse = await generateInquiryResponse({
        businessEmail: validation.data.businessEmail,
        message: validation.data.message,
        price: validation.data.price,
        companyInfo: validation.data.companyInfo,
      }, preferences);
      
      await storage.updateInquiryStatus(inquiry.id, "pending", aiResponse);

      // Create initial AI message in chat
      await storage.addMessage({
        inquiryId: inquiry.id,
        role: "assistant",
        content: aiResponse,
      });

      res.json({ ...inquiry, aiResponse });
    } catch (error) {
      console.error("Error creating inquiry:", error);
      res.status(500).json({ message: "Failed to create inquiry" });
    }
  });

  app.patch('/api/inquiries/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, message } = req.body;

      if (!["pending", "approved", "rejected", "needs_info"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Get inquiry details before updating
      const inquiry = await storage.getInquiry(id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      // Update the status
      const updatedInquiry = await storage.updateInquiryStatus(id, status);

      // Send email notification for non-pending statuses
      if (status !== "pending") {
        const userId = req.user.id;
        const influencer = await storage.getUser(userId);
        
        if (influencer && inquiry.businessEmail) {
          const influencerName = influencer.firstName 
            ? `${influencer.firstName}${influencer.lastName ? ` ${influencer.lastName}` : ''}`
            : influencer.username || 'The influencer';

          // Import email utility dynamically to avoid circular dependencies
          const { sendInquiryStatusEmail } = await import('./email.js');
          
          // Send email in background (don't await to avoid slowing down response)
          // Only send the optional custom message from the influencer, not the internal AI recommendation
          sendInquiryStatusEmail(
            inquiry.businessEmail,
            influencerName,
            status as 'approved' | 'rejected' | 'needs_info',
            message || undefined
          ).catch(err => console.error('Failed to send email:', err));
        }
      }

      res.json(updatedInquiry);
    } catch (error) {
      console.error("Error updating inquiry status:", error);
      res.status(500).json({ message: "Failed to update inquiry status" });
    }
  });

  app.delete('/api/inquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const inquiry = await storage.getInquiry(id);
      
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      // Verify that the authenticated user is the influencer for this inquiry
      const userId = req.user.id;
      if (inquiry.influencerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteInquiry(id);
      res.json({ message: "Inquiry deleted successfully" });
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      res.status(500).json({ message: "Failed to delete inquiry" });
    }
  });

  // Chat message routes
  app.get('/api/inquiries/:id/messages', async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByInquiry(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/inquiries/:id/messages', async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Get inquiry and verify it's active
      const inquiry = await storage.getInquiry(id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      if (!inquiry.chatActive) {
        return res.status(400).json({ message: "This conversation has been closed" });
      }

      // Add user message
      const userMessage = await storage.addMessage({
        inquiryId: id,
        role: "user",
        content,
      });

      // Get conversation history
      const conversationHistory = await storage.getMessagesByInquiry(id);

      // Get influencer preferences
      let preferences = await storage.getInfluencerPreferences(inquiry.influencerId);
      
      // Use default preferences if none are set
      if (!preferences) {
        preferences = {
          id: "default",
          userId: inquiry.influencerId,
          personalContentPreferences: "Various collaboration opportunities",
          monetaryBaseline: 500,
          contentLength: "Flexible",
          additionalGuidelines: null,
          createdAt: null,
          updatedAt: null,
        };
      }
      
      const aiResponseContent = await generateChatResponse(
        conversationHistory,
        {
          businessEmail: inquiry.businessEmail,
          message: inquiry.message,
          price: inquiry.price,
          companyInfo: inquiry.companyInfo,
        },
        preferences
      );

      // Add AI response
      const aiMessage = await storage.addMessage({
        inquiryId: id,
        role: "assistant",
        content: aiResponseContent,
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post('/api/inquiries/:id/close', async (req, res) => {
    try {
      const { id } = req.params;

      // Get inquiry
      const inquiry = await storage.getInquiry(id);
      if (!inquiry) {
        return res.status(404).json({ message: "Inquiry not found" });
      }

      if (!inquiry.chatActive) {
        return res.status(400).json({ message: "This conversation is already closed" });
      }

      // Get conversation history
      const conversationHistory = await storage.getMessagesByInquiry(id);

      // Get influencer preferences
      let preferences = await storage.getInfluencerPreferences(inquiry.influencerId);
      
      // Use default preferences if none are set
      if (!preferences) {
        preferences = {
          id: "default",
          userId: inquiry.influencerId,
          personalContentPreferences: "Various collaboration opportunities",
          monetaryBaseline: 500,
          contentLength: "Flexible",
          additionalGuidelines: null,
          createdAt: null,
          updatedAt: null,
        };
      }
      
      const recommendation = await generateRecommendation(
        conversationHistory,
        {
          businessEmail: inquiry.businessEmail,
          message: inquiry.message,
          price: inquiry.price,
          companyInfo: inquiry.companyInfo,
        },
        preferences
      );

      // Close chat and save recommendation
      const updatedInquiry = await storage.closeInquiryChat(id, recommendation);

      res.json(updatedInquiry);
    } catch (error) {
      console.error("Error closing chat:", error);
      res.status(500).json({ message: "Failed to close chat" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
