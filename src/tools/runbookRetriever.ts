import type { Runbook, Severity } from '../agent/types.ts';

export function matchRunbooks(
  runbooks: Runbook[],
  queryText: string,
  incidentSeverity: Severity,
  tags: string[] = []
): Array<{ runbook: Runbook; relevanceScore: number; matchReasons: string[] }> {
  const queryLower = queryText.toLowerCase();

  return runbooks
    .map((rb) => {
      let score = 0;
      const matchReasons: string[] = [];

      // Check tags
      for (const tag of rb.tags) {
        if (queryLower.includes(tag.toLowerCase())) {
          score += 25;
          matchReasons.push(`Tag matched: "${tag}"`);
        }
        if (tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) {
          score += 30;
          matchReasons.push(`Direct tag intersection: "${tag}"`);
        }
      }

      // Check title keywords
      const titleLower = rb.title.toLowerCase();
      if (
        (queryLower.includes('database') || queryLower.includes('pool') || queryLower.includes('connection')) &&
        (titleLower.includes('pool') || titleLower.includes('connection'))
      ) {
        score += 40;
        matchReasons.push('Direct database connection pool topic match');
      }

      if (
        (queryLower.includes('500') || queryLower.includes('config') || queryLower.includes('mismatch')) &&
        (titleLower.includes('config') || titleLower.includes('500'))
      ) {
        score += 40;
        matchReasons.push('Direct configuration and HTTP 500 error topic match');
      }

      // Check severity overlap
      if (rb.relevant_severity.includes(incidentSeverity)) {
        score += 15;
        matchReasons.push(`Incident severity [${incidentSeverity}] supported`);
      }

      return {
        runbook: rb,
        relevanceScore: Math.min(100, score),
        matchReasons,
      };
    })
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
