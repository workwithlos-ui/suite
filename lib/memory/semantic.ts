import type { SemanticContext, ClientProfile } from "@/lib/types";
import semanticData from "@/data/semantic.json";

let cachedContext: SemanticContext | null = null;

export function getSemanticContext(): SemanticContext {
  if (cachedContext) {
    return cachedContext;
  }

  cachedContext = semanticData as SemanticContext;
  return cachedContext;
}

export function getClientById(clientId: string): ClientProfile | null {
  const context = getSemanticContext();
  return context.clients.find((c) => c.id === clientId) ?? null;
}

export function getActiveClients(): ClientProfile[] {
  const context = getSemanticContext();
  return context.clients.filter((c) => c.status === "active");
}

export function getOperatorPrinciples(): string[] {
  const context = getSemanticContext();
  return context.operator.principles;
}

export function getVoiceRules(): string[] {
  const context = getSemanticContext();
  return context.operator.voice.rules;
}

export function searchSemanticContext(query: string): string {
  const context = getSemanticContext();
  const lowerQuery = query.toLowerCase();
  const results: string[] = [];

  if (
    lowerQuery.includes("client") ||
    context.clients.some((c) => lowerQuery.includes(c.name.toLowerCase()))
  ) {
    const matchedClients = context.clients.filter(
      (c) =>
        lowerQuery.includes(c.name.toLowerCase()) ||
        lowerQuery.includes(c.id) ||
        lowerQuery.includes("client")
    );
    for (const client of matchedClients) {
      results.push(
        `Client: ${client.name} | Industry: ${client.industry} | Market: ${client.market} | Stage: ${client.stage} | Revenue: ${client.revenue} | Focus: ${client.focus.join(", ")}`
      );
    }
  }

  if (
    lowerQuery.includes("product") ||
    lowerQuery.includes("platform") ||
    lowerQuery.includes("tool")
  ) {
    for (const product of context.products) {
      results.push(
        `Product: ${product.name} | ${product.description} | Status: ${product.status}`
      );
    }
  }

  if (lowerQuery.includes("rule") || lowerQuery.includes("principle")) {
    results.push(`Principles: ${context.operator.principles.join(" | ")}`);
    results.push(`Engagement Rules: ${context.rules.engagement.join(" | ")}`);
  }

  if (lowerQuery.includes("price") || lowerQuery.includes("pricing")) {
    results.push(`Pricing Rules: ${context.rules.pricing.join(" | ")}`);
  }

  if (lowerQuery.includes("framework") || lowerQuery.includes("elios")) {
    results.push(
      `ELIOS Framework: ${JSON.stringify(context.frameworks, null, 2)}`
    );
  }

  if (results.length === 0) {
    results.push(
      `ELIOS: ${context.operator.description}`,
      `Active Clients: ${context.clients
        .filter((c) => c.status === "active")
        .map((c) => c.name)
        .join(", ")}`,
      `Products: ${context.products.map((p) => p.name).join(", ")}`
    );
  }

  return results.join("\n\n");
}

export function invalidateCache(): void {
  cachedContext = null;
}
