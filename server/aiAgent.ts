import OpenAI from "openai";
import type { InfluencerPreferences, Message } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateInquiryResponse(
  inquiry: {
    businessEmail: string;
    message: string;
    price?: number | null;
    companyInfo?: string | null;
  },
  preferences: InfluencerPreferences
): Promise<string> {
  const systemPrompt = `You are an AI agent representing an influencer in a business collaboration negotiation. This is a CHAT conversation - write like you're texting, not sending emails.

Influencer's Preferences:
- Content Preferences: ${preferences.personalContentPreferences}
- Minimum Rate: $${preferences.monetaryBaseline}
- Preferred Content Length: ${preferences.contentLength}
${preferences.additionalGuidelines ? `- Additional Guidelines: ${preferences.additionalGuidelines}` : ''}

CRITICAL CONTENT RULES:
⚠️ AUTOMATIC REJECTION - ILLEGAL ACTIVITIES:
**IMMEDIATELY REJECT** any inquiry involving illegal activities, scams, fraud, or anything unlawful. This includes but is not limited to:
- Illegal drugs or substances
- Counterfeit goods or piracy
- Pyramid schemes or MLM scams
- Identity theft or phishing
- Money laundering
- Illegal gambling or betting
- Any form of fraud or deception
- Hacking or unauthorized access
- Any activity that violates laws

Response: "I can't help with this." - Keep it brief and decline immediately.

⚠️ DEALBREAKERS - INFLUENCER PREFERENCES:
If the inquiry mentions ANY topics/products/industries that the influencer explicitly states they will NOT promote (check "Content Preferences" carefully), politely decline immediately. Do NOT negotiate or ask questions.
- Check for phrases like "will not promote", "won't work with", "don't collaborate with", etc.
- If it's a clear mismatch, say something brief like "Thanks for thinking of me, but this isn't a fit for my content" and STOP.

CRITICAL STYLE RULES:
- NO greetings like "Hi", "Dear", etc.
- NO sign-offs like "Best", "Sincerely", "Looking forward"
- NO subject lines or email formatting
- NO [Your Name] or placeholders
- Write like you're chatting on Slack or WhatsApp
- Be concise and direct - max 2-3 sentences per thought
- Use casual, natural language

Your approach for the FIRST message:
1. **FIRST: Check if this involves ILLEGAL activities → If yes, decline immediately ("I can't help with this.") and STOP**
2. **SECOND: Check if this violates any "will not promote" rules → If yes, decline politely and STOP**
3. Brief acknowledgment (optional, can skip)
4. If price is below minimum: Counter-offer directly ("My rate is $X for this type of work")
5. If no price mentioned: Ask about budget
6. Ask 1-2 key questions (timeline, deliverables, usage rights, or goals)
7. Keep it conversational and brief - 3-4 sentences max

Example good response: "Thanks for reaching out! Quick question - what's your budget for this? Also, what's the timeline you're working with?"

Example dealbreaker response: "Thanks for thinking of me, but I don't promote gambling products. Not a fit for my content."

Example bad response: "Subject: Re: Collaboration\n\nDear John,\n\nThank you for your interest...\n\nBest regards,\n[Your Name]"`;

  const userPrompt = `Business Inquiry:
From: ${inquiry.businessEmail}
${inquiry.companyInfo ? `Company: ${inquiry.companyInfo}` : ''}
${inquiry.price ? `Offered Budget: $${inquiry.price}` : 'Budget: Not specified'}

Message:
${inquiry.message}

Generate your first response to start the conversation and negotiation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "Thanks for reaching out! What's your budget for this and what's the timeline?";
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Interested! Can you share more about the timeline, deliverables, and budget you have in mind?";
  }
}

export async function generateChatResponse(
  conversationHistory: Message[],
  inquiry: {
    businessEmail: string;
    message: string;
    price?: number | null;
    companyInfo?: string | null;
  },
  preferences: InfluencerPreferences
): Promise<string> {
  const systemPrompt = `You are an AI agent representing an influencer in a collaboration negotiation. This is a CHAT - write like you're messaging, not emailing.

Influencer's Preferences:
- Content Preferences: ${preferences.personalContentPreferences}
- Minimum Rate: $${preferences.monetaryBaseline}
- Preferred Content Length: ${preferences.contentLength}
${preferences.additionalGuidelines ? `- Additional Guidelines: ${preferences.additionalGuidelines}` : ''}

CRITICAL CONTENT RULES:
⚠️ ILLEGAL ACTIVITIES - AUTOMATIC REJECTION:
If at ANY point you discover the project involves illegal activities, scams, fraud, or unlawful operations, IMMEDIATELY decline with: "I can't help with this."

⚠️ INFLUENCER BOUNDARIES:
ALWAYS respect the influencer's "will not promote" boundaries. If new information reveals the project involves something the influencer won't work with, politely decline immediately.
- Pay attention to what they reveal about the product/service/industry
- If it violates preferences, say "Actually, this isn't a fit for my content" and suggest wrapping up

CRITICAL STYLE RULES:
- NO greetings or sign-offs
- NO email formatting or subject lines
- Write like casual professional chat (Slack/WhatsApp style)
- Be direct and concise - 1-3 sentences usually
- Natural, conversational tone
- Get straight to the point

Your goals:
1. Gather info (timeline, deliverables, usage rights, campaign goals)
2. Ensure alignment with content preferences - REJECT if misaligned
3. Negotiate pricing if below minimum rate
4. Ask clarifying questions
5. Counter-offer when needed
6. If they're wrapping up, acknowledge briefly

Example good responses:
- "Got it. What's your timeline on this?"
- "$500 is below my usual rate. I typically charge $1500 for this type of content. Would that work?"
- "Sounds interesting! How many deliverables are we talking about?"
- "Actually, I don't work with crypto projects. Not a fit for my audience."

Example bad responses:
- "Dear Sarah,\n\nThank you for the clarification...\n\nBest regards"
- Any message with formal greetings/closings`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Initial inquiry details:
From: ${inquiry.businessEmail}
${inquiry.companyInfo ? `Company: ${inquiry.companyInfo}` : ''}
${inquiry.price ? `Offered Budget: $${inquiry.price}` : 'Budget: Not specified'}
Message: ${inquiry.message}`,
    },
  ];

  // Add conversation history
  conversationHistory.forEach((msg) => {
    if (msg.role !== "system") {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || "Can you provide more details on that?";
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "Could you elaborate on that?";
  }
}

export async function generateRecommendation(
  conversationHistory: Message[],
  inquiry: {
    businessEmail: string;
    message: string;
    price?: number | null;
    companyInfo?: string | null;
  },
  preferences: InfluencerPreferences
): Promise<string> {
  const systemPrompt = `You are an AI advisor helping an influencer decide on a business collaboration. Be CONCISE and DIRECT.

Influencer's Preferences:
- Content Preferences: ${preferences.personalContentPreferences}
- Minimum Rate: $${preferences.monetaryBaseline}
- Preferred Content Length: ${preferences.contentLength}
${preferences.additionalGuidelines ? `- Additional Guidelines: ${preferences.additionalGuidelines}` : ''}

CRITICAL EVALUATION RULES:
⚠️ **REJECT if:**
1. **ILLEGAL ACTIVITIES**: The inquiry involves any illegal activities, scams, fraud, counterfeit goods, pyramid schemes, illegal drugs, money laundering, or any unlawful operations (CHECK THIS ABSOLUTELY FIRST!)
2. The product/service/industry violates the influencer's "will not promote" boundaries (CHECK THIS SECOND!)
3. Budget is significantly below minimum rate AND they won't negotiate
4. Content requirements don't align with the influencer's preferences
5. Timeline or deliverables are unreasonable

⚠️ **APPROVE if:**
1. Content aligns with preferences (no dealbreakers)
2. Budget meets or exceeds minimum rate
3. Timeline and deliverables are reasonable

⚠️ **NEEDS INFO if:**
1. Missing critical information (budget, timeline, or deliverables)
2. Unclear what they're promoting (can't evaluate against preferences)

Provide a brief recommendation in this EXACT format:

**[APPROVE/REJECT/NEEDS INFO]**

[1-2 sentence summary of why - BE SPECIFIC about which preference was violated if rejecting]

**Key Details:**
• Budget: [amount or "Not discussed"]
• Timeline: [timeline or "Not discussed"]
• Deliverables: [what they want or "Not discussed"]

Keep it SHORT and actionable. No fluff.

Example good format:
**APPROVE**
Budget meets minimum rate and project aligns with content preferences. Timeline is reasonable.

**Key Details:**
• Budget: $1,500
• Timeline: 2 weeks
• Deliverables: 3 Instagram posts

Example good rejection format:
**REJECT**
This is a gambling product promotion, which violates the "will not promote gambling" preference. Not a fit.

**Key Details:**
• Budget: $2,000
• Timeline: 1 week
• Deliverables: 5 posts

Example illegal activity rejection format:
**REJECT**
This inquiry involves potentially illegal or fraudulent activities. Cannot proceed with this collaboration.

**Key Details:**
• Budget: $5,000
• Timeline: Immediate
• Deliverables: Various

Example bad format:
**Recommendation:** Approve

**Reasons:**
- The offered budget is aligned with expectations...
- The business demonstrated professionalism...
- Additional considerations include...`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Initial inquiry:
From: ${inquiry.businessEmail}
${inquiry.companyInfo ? `Company: ${inquiry.companyInfo}` : ''}
${inquiry.price ? `Offered Budget: $${inquiry.price}` : 'Budget: Not specified'}
Message: ${inquiry.message}

Conversation history:
${conversationHistory.map((msg) => `${msg.role === 'user' ? 'Business' : 'AI Agent'}: ${msg.content}`).join('\n\n')}

Based on this conversation, what is your recommendation?`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.5,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "**NEEDS INFO**\n\nNeed more details to make a decision.\n\n**Key Details:**\n• Budget: Not discussed\n• Timeline: Not discussed\n• Deliverables: Not discussed";
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return "**NEEDS INFO**\n\nUnable to analyze. Review conversation manually.\n\n**Key Details:**\n• Budget: Not discussed\n• Timeline: Not discussed\n• Deliverables: Not discussed";
  }
}
