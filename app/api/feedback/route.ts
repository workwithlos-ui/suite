import { saveAgentMemory, recordOutcome } from '@/lib/memory/agent-memory';
import type { AgentId } from '@/lib/types';

// POST /api/feedback
// Two modes:
// 1. save — save a new memory after agent response
// 2. outcome — record what happened when they acted on advice

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      mode: 'save' | 'outcome';
      // for save:
      agentId?: AgentId;
      sessionId?: string;
      operatorId?: string;
      question?: string;
      keyInsight?: string;
      context?: string;
      // for outcome:
      memoryId?: string;
      outcome?: string;
      wasHelpful?: boolean;
    };

    if (body.mode === 'outcome') {
      if (!body.memoryId || !body.outcome) {
        return Response.json({ error: 'memoryId and outcome required' }, { status: 400 });
      }
      const ok = await recordOutcome(body.memoryId, body.outcome, body.wasHelpful ?? true);
      return Response.json({ success: ok });
    }

    if (body.mode === 'save') {
      if (!body.agentId || !body.keyInsight) {
        return Response.json({ error: 'agentId and keyInsight required' }, { status: 400 });
      }
      const memory = await saveAgentMemory({
        agent_id: body.agentId,
        session_id: body.sessionId,
        operator_id: body.operatorId ?? 'default',
        question: body.question,
        key_insight: body.keyInsight,
        context: body.context,
      });
      return Response.json({ success: true, memory });
    }

    return Response.json({ error: 'mode must be save or outcome' }, { status: 400 });
  } catch (error) {
    console.error('[feedback]', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

// GET /api/feedback?agentId=rex&operatorId=default
// Returns memories for an agent — used to populate "What Rex has learned" panel
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') as AgentId | null;
    const operatorId = searchParams.get('operatorId') ?? 'default';

    if (!agentId) return Response.json({ error: 'agentId required' }, { status: 400 });

    const { getAgentMemories, getActedOnMemories } = await import('@/lib/memory/agent-memory');
    const [recent, proven] = await Promise.all([
      getAgentMemories(agentId, operatorId, 10),
      getActedOnMemories(agentId, operatorId, 5),
    ]);

    return Response.json({ agentId, operatorId, recent, proven, total: recent.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
