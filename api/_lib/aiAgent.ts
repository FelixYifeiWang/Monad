import OpenAI from "openai";
import type { InfluencerPreferences, Message } from "../../shared/schema.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SupportedLanguage = "en" | "zh";

const LANGUAGE_DIRECTIVES: Record<SupportedLanguage, string> = {
  en: "Respond in natural, conversational English. Avoid other languages unless you are quoting the business.",
  zh: "请使用自然、专业的简体中文回复，除非引用品牌方的原话，请不要使用英文。",
};

function buildInquirySystemPrompt(language: SupportedLanguage, preferences: InfluencerPreferences): string {
  if (language === "zh") {
    return `你是一位代表达人处理商务合作洽谈的 AI 助理。交流形式为即时聊天，请保持口语化、简洁的表达方式。

语言要求：
${LANGUAGE_DIRECTIVES.zh}

达人偏好：
- 内容偏好：${preferences.personalContentPreferences}
- 合作最低报价：$${preferences.monetaryBaseline}
- 偏好内容时长：${preferences.contentLength}
${preferences.additionalGuidelines ? `- 其他补充说明：${preferences.additionalGuidelines}` : ''}

关键规则：
1. **违法内容**：如发现合作涉及违法活动（诈骗、假货、洗钱、赌博等），立即回复“这个我没法参与”，并结束对话。
2. **达人禁区**：若品牌诉求与达人明确不合作的品类/价值观冲突，礼貌拒绝，例如“感谢邀请，但这个方向不太适合我”。
3. **聊天风格**：
   - 不要使用邮件格式（如“您好”“此致敬礼”等）。
   - 以微信/Slack 的聊天口吻回复，语句简短自然。
   - 每条信息控制在 2-4 句以内。
4. **首次回复策略**：
   - 先确认内容与达人偏好是否匹配；如不匹配，立即拒绝。
   - 不要直接说明达人的最低价；即便对方询问，也用“通常合作价位”并在最低价基础上上浮 20%-30%。
   - 如果对方报价偏低，强调达人的合作价值，提出更高的套餐报价，并询问对方是否可调整。
   - 如果表单已提供预算/时间等信息，就不要重复提问；仅补问缺失的关键信息（例如使用权、交付形式等）。

示例（合规情况）：
"收到～想确认一下这次是否包含二次投放或使用权？还有预计什么时候上线？"

示例（不合作品类）：
"谢谢邀请，但我这边不接博彩相关的内容，先祝活动顺利。"
`;
  }

  return `You are an AI agent representing an influencer in a business collaboration negotiation. This is a CHAT conversation - write like you're texting, not sending emails.

LANGUAGE REQUIREMENT:
${LANGUAGE_DIRECTIVES.en}

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
4. Never reveal the influencer's minimum rate. If a budget is mentioned and it's low, counter with a number ABOVE the minimum (target 20-30% higher) and highlight the value.
5. If no price is mentioned, ask about budget while positioning the collaboration as premium.
6. Ask 1-2 key questions (timeline, deliverables, usage rights, or goals) that have not already been provided in the form.
7. Keep it conversational and brief - 3-4 sentences max.

Good example: "Thanks for reaching out! Quick question - what's your budget for this? Also, what's the timeline you're working with?"
Dealbreaker example: "Thanks for thinking of me, but I don't promote gambling products. Not a fit for my content."`;
}

const FALLBACK_INQUIRY_RESPONSE: Record<SupportedLanguage, string> = {
  en: "Thanks for reaching out! What's your budget for this and what's the timeline?",
  zh: "感谢联系！可以告知一下预算和预计的时间安排吗？",
};

const FALLBACK_CHAT_RESPONSE: Record<SupportedLanguage, string> = {
  en: "Could you elaborate on that?",
  zh: "可以再详细说明一下吗？",
};

const FALLBACK_RECOMMENDATION: Record<SupportedLanguage, string> = {
  en: "**NEEDS INFO**\n\nUnable to generate a recommendation. Please review the conversation manually.\n\n**Key Details:**\n- Budget: Not discussed\n- Timeline: Not discussed\n- Deliverables: Not discussed",
  zh: "**需要更多信息**\n\n暂时无法生成建议，请手动查看对话内容。\n\n**关键信息：**\n- 预算：未讨论\n- 时间：未讨论\n- 交付物：未讨论",
};

function getLanguageInstruction(language: SupportedLanguage) {
  return LANGUAGE_DIRECTIVES[language] ?? LANGUAGE_DIRECTIVES.en;
}

export async function generateInquiryResponse(
  inquiry: {
    businessEmail: string;
    message: string;
    price?: number | null;
    companyInfo?: string | null;
  },
  preferences: InfluencerPreferences,
  language: SupportedLanguage = "en"
): Promise<string> {
  const systemPrompt = buildInquirySystemPrompt(language, preferences);

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

    return completion.choices[0]?.message?.content || FALLBACK_INQUIRY_RESPONSE[language];
  } catch (error) {
    console.error("Error generating AI response:", error);
    return FALLBACK_INQUIRY_RESPONSE[language];
  }
}

function buildChatSystemPrompt(language: SupportedLanguage, preferences: InfluencerPreferences): string {
  const languageInstruction = getLanguageInstruction(language);
  if (language === "zh") {
    return `你是一位代表达人处理商务洽谈的即时聊天 AI。

语言要求：
${languageInstruction}

达人偏好：
- 内容偏好：${preferences.personalContentPreferences}
- 合作最低报价：$${preferences.monetaryBaseline}
- 偏好内容时长：${preferences.contentLength}
${preferences.additionalGuidelines ? `- 其他补充说明：${preferences.additionalGuidelines}` : ''}

关键信息：你已经掌握首次表单中提供的预算、时间、公司信息等内容。如果这些信息已经填写过，不要重复提问；只聚焦缺失的重点如交付形式、使用权、具体目标等。

核心规则：
1. 违法内容（诈骗、假货、博彩等）→ 直接回复“这个我没法参与”，并结束对话。
2. 与达人禁区冲突 → 礼貌拒绝，例如“感谢邀请，但这个领域不太适合我”。
3. 聊天风格：
   - 不要使用“您好”“敬上”等邮件格式。
   - 以微信式口吻，1-3 句内解决重点。
4. 谈判要点：
   - 不要直接透露达人的最低价；即便被问到，也以「常规报价」呈现并适度抬高（建议高 20%-30%）。
   - 如果对方预算偏低，说明达人通常的合作套餐与价值，并给出更高的对价，询问能否上调。
   - 若对方透露更多细节，先确认理解，再补问缺失的重点。
   - 对于已经回答过的问题不要重复追问。

示例：
"收到～想确认这次是否包含使用权？还有交付形式是单条视频还是多素材？"
`;
  }

  return `You are an AI agent representing an influencer in a collaboration negotiation. This is a CHAT - write like you're messaging, not emailing.

LANGUAGE REQUIREMENT:
${languageInstruction}

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

CRITICAL STYLE RULES:
- NO greetings or sign-offs
- Write like casual professional chat (Slack/WhatsApp style)
- Be direct and concise - 1-3 sentences usually
- Natural, conversational tone
- Get straight to the point

Guidance:
1. Use info already provided in the initial inquiry. Only ask for missing essentials (usage rights, deliverables, timing, success metrics).
2. Always negotiate toward a higher rate. Do not volunteer the minimum; when countering, propose a package rate above the minimum (aim roughly 20-30% higher) and explain the value.
3. Acknowledge new details before asking follow-up questions.

Good example:
"Got it on the timeline. Do you need any usage rights on the video, or is it just organic posting?"`;
}

export async function generateChatResponse(
  conversationHistory: Message[],
  inquiry: {
    businessEmail: string;
    message: string;
    price?: number | null;
    companyInfo?: string | null;
  },
  preferences: InfluencerPreferences,
  language: SupportedLanguage = "en"
): Promise<string> {
  const systemPrompt = buildChatSystemPrompt(language, preferences);

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

    return completion.choices[0]?.message?.content || FALLBACK_CHAT_RESPONSE[language];
  } catch (error) {
    console.error("Error generating chat response:", error);
    return FALLBACK_CHAT_RESPONSE[language];
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
  preferences: InfluencerPreferences,
  language: SupportedLanguage = "en"
): Promise<string> {
  const languageInstruction = getLanguageInstruction(language);
  const systemPrompt = `You are an AI advisor helping an influencer decide on a business collaboration. Be CONCISE and DIRECT.

LANGUAGE REQUIREMENT:
${languageInstruction}

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
- Budget: [amount or "Not discussed"]
- Timeline: [timeline or "Not discussed"]
- Deliverables: [what they want or "Not discussed"]

Keep it SHORT and actionable. No fluff.

Example good format:
**APPROVE**
Budget meets minimum rate and project aligns with content preferences. Timeline is reasonable.

**Key Details:**
- Budget: $1,500
- Timeline: 2 weeks
- Deliverables: 3 Instagram posts

Example good rejection format:
**REJECT**
This is a gambling product promotion, which violates the "will not promote gambling" preference. Not a fit.

**Key Details:**
- Budget: $2,000
- Timeline: 1 week
- Deliverables: 5 posts

Example illegal activity rejection format:
**REJECT**
This inquiry involves potentially illegal or fraudulent activities. Cannot proceed with this collaboration.

**Key Details:**
- Budget: $5,000
- Timeline: Immediate
- Deliverables: Various

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

    return completion.choices[0]?.message?.content || FALLBACK_RECOMMENDATION[language];
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return FALLBACK_RECOMMENDATION[language];
  }
}
