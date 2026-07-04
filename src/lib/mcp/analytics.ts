/**
 * MCP Analytics — logs tool calls to Upstash Redis for funnel tracking.
 *
 * Tracks: queries per tool per day, most searched categories, unique IPs.
 * No-ops silently when UPSTASH_REDIS_REST_URL / _TOKEN are not configured, so
 * analytics never becomes a hard dependency of the MCP endpoint.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export async function logMcpQuery(
  toolName: string,
  params: Record<string, unknown>,
  ip: string,
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const date = new Date().toISOString().split('T')[0];

  try {
    const pipeline = r.pipeline();

    pipeline.hincrby(`mcp:stats:${date}`, toolName, 1);
    pipeline.hincrby(`mcp:stats:${date}`, 'total', 1);
    pipeline.expire(`mcp:stats:${date}`, 90 * 24 * 3600);

    pipeline.pfadd(`mcp:ips:${date}`, ip);
    pipeline.expire(`mcp:ips:${date}`, 90 * 24 * 3600);

    const category = params.category as string | undefined;
    if (category) {
      pipeline.hincrby(`mcp:categories:${date}`, category, 1);
      pipeline.expire(`mcp:categories:${date}`, 90 * 24 * 3600);
    }

    await pipeline.exec();
  } catch {
    // Analytics failures should never break MCP responses
  }
}
