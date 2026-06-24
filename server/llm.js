/**
 * Optional LLM layer — set GROQ_API_KEY (free tier at console.groq.com) for higher-quality scoring narratives.
 * Falls back to null; callers use heuristics when LLM unavailable.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function llmConfigured() {
  return !!process.env.GROQ_API_KEY?.trim();
}

export async function llmComplete({ system, user, maxTokens = 600, temperature = 0.25 }) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return { text: null, provider: 'none' };

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[LLM] Groq error:', res.status, err.slice(0, 200));
      return { text: null, provider: 'groq', error: err };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || null;
    return { text, provider: 'groq', model: data.model };
  } catch (e) {
    console.warn('[LLM]', e.message);
    return { text: null, provider: 'groq', error: e.message };
  }
}

export async function scoreWithLlm({ context, heuristicScore, bucket }) {
  const system = `You are an expert technical recruiter. Evaluate candidates using ONLY the provided evidence.
Output JSON only: {"overall":0-100,"bucket":"Green|Amber|Red","explanation":"2-3 sentences","recommendation":"next step","risk_flags":["..."]}
Green >= 80, Amber 60-79, Red < 60. Never invent facts not in context.`;

  const user = `Heuristic pre-score: ${heuristicScore}/100 (${bucket})\n\n${context}`;

  const { text, provider } = await llmComplete({ system, user, maxTokens: 400 });
  if (!text) return null;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return { ...JSON.parse(jsonMatch[0]), llm_provider: provider };
  } catch {
    return { explanation: text, llm_provider: provider };
  }
}

export async function scoreIntelligenceWithLlm({
  job,
  posting,
  resumeText,
  perQuestion,
  dimensions,
  behavioral,
}) {
  const system = `You are a senior technical recruiter building a Candidate Intelligence Report.
Evaluate ONLY provided evidence. Return JSON only:
{
  "overall": 0-100,
  "explanation": "2-3 sentences",
  "dimensions": {
    "technical_competency": 0-100,
    "problem_solving": 0-100,
    "communication": 0-100,
    "project_ownership": 0-100,
    "authenticity": 0-100,
    "resume_consistency": 0-100
  },
  "per_question": [
    {
      "category_id": "id",
      "questionScore": 0-100,
      "strengths": ["..."],
      "concerns": ["..."]
    }
  ]
}
Do NOT treat tab switches as automatic rejection. Use behavioral data as confidence context only.`;

  const qSummary = perQuestion
    .map(
      (p) =>
        `[${p.category_id}] ${p.category_type}: ${p.question}\nScore heuristic: ${p.questionScore}\nStrengths: ${(p.strengths || []).join('; ')}`
    )
    .join('\n\n');

  const user = `Job: ${job?.title}
Required skills context: ${JSON.stringify(posting?.requiredQualifications?.slice(0, 8) || [])}
Heuristic dimensions: ${JSON.stringify(dimensions)}
Behavioral (context only): tab switches=${behavioral?.tab_switches}, paste=${behavioral?.paste_events}
Resume excerpt: ${(resumeText || '').slice(0, 2000)}

Questions:\n${qSummary}`;

  const { text, provider } = await llmComplete({ system, user, maxTokens: 900, temperature: 0.2 });
  if (!text) return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return { ...JSON.parse(jsonMatch[0]), llm_provider: provider };
  } catch {
    return { explanation: text, llm_provider: provider };
  }
}

export async function interviewAnalysisWithLlm({ context, heuristicResult }) {
  const system = `You are an interview evaluator. Analyze transcript evidence only.
Return JSON: {"overall":0-100,"bucket":"Green|Amber|Red","explanation":"...","genuineness_note":"...","ai_risk":"low|medium|high"}`;

  const user = `Heuristic: ${JSON.stringify(heuristicResult)}\n\n${context}`;

  const { text, provider } = await llmComplete({ system, user, maxTokens: 500 });
  if (!text) return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return { ...JSON.parse(jsonMatch[0]), llm_provider: provider };
  } catch {
    return { explanation: text, llm_provider: provider };
  }
}
