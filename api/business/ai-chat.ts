import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { requireAuth } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';

type ChatRole = 'user' | 'assistant';
type SupportedLanguage = 'en' | 'zh';

const LANGUAGE_DIRECTIVES: Record<SupportedLanguage, string> = {
  en: 'Respond in concise, natural English. Keep it conversational, not like an email.',
  zh: '请用简洁、口语化的中文回复，不要使用邮件格式或过度客套。',
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeLanguage(value: unknown): SupportedLanguage {
  return value === 'zh' ? 'zh' : 'en';
}

function buildSystemPrompt(language: SupportedLanguage, profile: Awaited<ReturnType<typeof storage.getBusinessProfile>> | null) {
  const brandLines = [
    profile?.companyName ? `Brand: ${profile.companyName}` : null,
    profile?.industry ? `Industry: ${profile.industry}` : null,
    profile?.description ? `Brand story: ${profile.description}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (language === 'zh') {
    return `你是品牌方的 AI 助理，提供商务策略、邮件草稿和下一步建议。保持聊天式回答，每条回复 2-4 句。\n\n语言要求：${LANGUAGE_DIRECTIVES.zh}\n\n品牌背景：\n${brandLines || '暂无品牌资料，可用对话中获取更多信息。'}\n\n规则：\n1) 不要使用邮件格式（无需称呼/签名）。\n2) 优先给出可执行的步骤或模板。\n3) 若信息不足，先提出最多 2 条追问。\n4) 保持中立、务实，避免夸张承诺。`;
  }

  return `You are the brand's AI copilot for strategy, outreach drafts, and next-step recommendations. Write like a chat, not an email.\n\nLanguage rule: ${LANGUAGE_DIRECTIVES.en}\n\nBrand context:\n${brandLines || 'No saved brand profile yet; ask clarifying questions to personalize advice.'}\n\nGuidelines:\n1) Avoid email formatting (no greetings/sign-offs).\n2) Prefer actionable steps or short templates.\n3) If info is missing, ask up to 2 clarifying questions.\n4) Be concise and pragmatic; avoid over-promising.`;
}

export default requireAuth(async (req: VercelRequest, res: VercelResponse) => {
  // @ts-ignore
  const user = req.user as { id: string; userType: string };

  if (user.userType !== 'business') {
    return res.status(403).json({ message: 'Business access required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const language = normalizeLanguage((req.body as { language?: string })?.language);
    const incomingMessages = Array.isArray((req.body as { messages?: unknown }).messages)
      ? ((req.body as { messages: Array<{ role: ChatRole; content: string }> }).messages || []).filter(
          (m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim(),
        )
      : [];

    const profile = await storage.getBusinessProfile(user.id);
    const systemPrompt = buildSystemPrompt(language, profile);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...incomingMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const content = completion.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a response.';

    res.json({
      message: {
        role: 'assistant',
        content,
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Failed to reach AI assistant' });
  }
});
