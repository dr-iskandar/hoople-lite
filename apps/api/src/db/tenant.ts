import type { Pool, PoolClient } from 'pg';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Caller MUST authenticate and authorize user membership in orgId first.
 * Client-supplied headers are never enough to establish tenancy.
 * set_config(..., true) is scoped to the current transaction.
 */
export async function withTenant<T>(
  pool: Pick<Pool, 'connect'>,
  orgId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(orgId)) throw new Error('Invalid organization ID');
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query('BEGIN');
    begun = true;
    await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (begun) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    }
    throw error;
  } finally {
    client.release();
  }
}
