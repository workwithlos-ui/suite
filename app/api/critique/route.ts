import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface CritiqueRequest {
  content: string;
  contentType: "linkedin" | "twitter" | "instagram" | "email" | "blog" | "shorts";
  icp?: string;
  brand?: string;
}

interface SPCLScore {
  S: number; P: number; C: number; L: number;
  overall: number;
  verdict: string;
  passedGate: boolean;
}

interface CritiqueResponse {
  original: string;
  critique: string;
  weaknesses: string[];
  revised: string;
  score: SPCLScore;
}

const PLATFORM_SPECS: Record<string, string> = {
  linkedin: "150-250 words. Short paragraphs. Max 3 hashtags at end. First line must stop scroll standalone.",
  twitter: "5-7 tweet thread. Each tweet under 280 chars and standalone. No hashtags.",
  instagram: "Under 200 words. Hook + value + CTA. 15-20 hashtags at end.",
  email: "Subject + preview line + 400-600 word body. Single CTA.",
  blog: "Title + meta + 1500+ words with H2/H3 headers.",
  shorts: "Hook in first 3 words. Full payoff under 60 seconds. Script format.",
};

async function critiqueContent(content: string, contentType: string, icp: string) {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are an adversarial content critic. You have reviewed 100,000 AI-generated posts.
Find every weakness before a human posts something that underperforms.

WHAT TO FLAG:
1. Generic AI patterns: "game-changer", "leverage", "unlock", "in today's landscape"
2. Obvious hooks — any hook 10 other AI tools would generate
3. Claims without named clients, real numbers, documented outcomes
4. Weak CTAs: hashtags instead of action, vague "connect with me"
5. Wrong awareness stage: selling to someone who doesn't know they have the problem
6. LinkedIn cliche openers: "Unpopular opinion:", "Nobody talks about:", "Let me be honest:"
7. Strong hook followed by weak second line (the click-through killer)
8. Self-congratulation without proof

Return ONLY valid JSON — no markdown, no fences:
{"critique":"3-4 sentences on main weaknesses","weaknesses":["w1","w2","w3"],"initialScore":0-100}`,
    messages: [{
      role: "user",
      content: `TYPE: ${contentType}\nICP: ${icp}\n\nCONTENT:\n${content}\n\nFind the 3 critical weaknesses. Return JSON only.`,
    }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  try {
    return JSON.parse(raw) as { critique: string; weaknesses: string[]; initialScore: number };
  } catch {
    return { critique: raw, weaknesses: [], initialScore: 65 };
  }
}

async function reviseContent(
  original: string, critique: string, weaknesses: string[],
  contentType: string, brand: string, icp: string
): Promise<string> {
  const spec = PLATFORM_SPECS[contentType] ?? "200 word post";
  const res = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1200,
    system: `You are an elite content writer revising a draft based on specific weaknesses.

ANTI-SLOP RULES (enforce strictly):
- Lead with specific number or named result — never generic opener
- No forbidden words: leverage, synergy, game-changer, unlock, empower, innovative
- No forbidden openers: "In today's...", "Have you ever...", "Unpopular opinion:"
- Every claim backed by metric, named client, or documented outcome
- End with tension or specific CTA — never a neat summary
- CTA must be specific: "DM me SYSTEM" not "connect with me"
- Named examples beat abstract: "Trusted Roofing" beats "a roofing company"

Platform spec for ${contentType}: ${spec}
Brand voice: ${brand}
Target ICP: ${icp}

Fix every weakness listed. Maintain the core idea. Return revised content only — no explanation.`,
    messages: [{
      role: "user",
      content: `ORIGINAL:\n${original}\n\nCRITIQUE:\n${critique}\n\nWEAKNESSES TO FIX:\n${weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")}\n\nWrite the revised version. Return content only.`,
    }],
  });
  return res.content[0].type === "text" ? res.content[0].text : original;
}

async function scoreContent(content: string, icp: string, contentType: string): Promise<SPCLScore> {
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 350,
    system: `You are an independent content quality judge. You did NOT write this content.
Score it against SPCL (0-10 each):
S (Status): Elevates author's perceived authority in their category?
P (Power): Demonstrates real capability or track record?
C (Credibility): Claims anchored to named clients, real numbers, documented outcomes?
L (Likeness): Speaks exact language of ICP — their fears, desires, internal monologue?

CALIBRATION:
9-10: Outperforms 90% of content on platform. Post immediately.
7-8: Strong, would perform well.
5-6: Average. Needs meaningful revision.
3-4: Generic AI output. Do not post.

Return ONLY valid JSON:
{"S":0-10,"P":0-10,"C":0-10,"L":0-10,"overall":0-100,"verdict":"one sentence on whether to post"}`,
    messages: [{
      role: "user",
      content: `TYPE: ${contentType}\nICP: ${icp}\n\nCONTENT:\n${content}\n\nScore on SPCL. Return JSON only.`,
    }],
  });

  const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
  try {
    const parsed = JSON.parse(raw) as Omit<SPCLScore, "passedGate">;
    return { ...parsed, passedGate: parsed.overall >= 75 };
  } catch {
    return { S: 7, P: 7, C: 7, L: 7, overall: 70, verdict: "Score unavailable", passedGate: false };
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as CritiqueRequest;
    if (!body.content) return Response.json({ error: "Content required" }, { status: 400 });

    const contentType = body.contentType ?? "linkedin";
    const icp = body.icp ?? "agency owners $1M-$5M";
    const brand = body.brand ?? "ELIOS";

    // Step 1: Adversarial critique
    const { critique, weaknesses } = await critiqueContent(body.content, contentType, icp);

    // Step 2: Revise based on critique
    const revised = await reviseContent(body.content, critique, weaknesses, contentType, brand, icp);

    // Step 3: Independent score on REVISED content (not original)
    const score = await scoreContent(revised, icp, contentType);

    const response: CritiqueResponse = {
      original: body.content,
      critique,
      weaknesses,
      revised,
      score,
    };

    return Response.json(response);
  } catch (error) {
    console.error("[critique]", error);
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
