import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import {
  type AuthSettings, type Creator, type DbPool, setOrganizationContext, withCreator,
} from './creator-auth.js';
import { creatorCookieNames } from './creator-routes.js';

type Role = 'owner'|'admin'|'editor'|'analyst'|'viewer'|'billing';
type Organization = { id:string; slug:string; name:string; role:Role };
type Response = {status:number; payload:unknown};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9][a-z0-9-]{1,62}$/;
const ok = (payload: unknown, status = 200): Response => ({status,payload});
const fail = (status:number, error:string): Response => ({status,payload:{error}});

function validateFields(payload: unknown, allowPartial: boolean) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = payload as Record<string,unknown>;
  if (Object.keys(value).some(k => !['slug','name'].includes(k))) return null;
  if (!allowPartial && (value.slug === undefined || value.name === undefined)) return null;
  if (allowPartial && value.slug === undefined && value.name === undefined) return null;
  if (value.slug !== undefined && (typeof value.slug !== 'string' || !slugPattern.test(value.slug))) return null;
  if (value.name !== undefined && (typeof value.name !== 'string'
    || value.name.trim().length < 2 || value.name.trim().length > 100)) return null;
  return {slug:value.slug as string|undefined, name:typeof value.name === 'string' ? value.name.trim() : undefined};
}

async function membership(client:PoolClient, orgId:string, userId:string): Promise<Role|null> {
  await setOrganizationContext(client,orgId);
  const rows = await client.query<{role:Role}>(`SELECT m.role FROM memberships m JOIN organizations o
    ON o.id=m.organization_id WHERE m.organization_id=$1 AND m.user_id=$2 AND o.archived_at IS NULL`,[orgId,userId]);
  return rows.rows[0]?.role ?? null;
}

export function registerOrganizationRoutes(app: FastifyInstance, pool?: DbPool, settings?: AuthSettings) {
  const cookie = creatorCookieNames(settings?.secureCookies ?? true).session;
  async function execute(request: FastifyRequest, reply: FastifyReply,
    work: (client:PoolClient,creator:Creator) => Promise<Response>, mutation = false) {
    if (mutation && (!settings || request.headers.origin !== settings.webOrigin)) {
      return reply.code(403).send({error:'FORBIDDEN_ORIGIN'});
    }
    if (!pool) return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    try {
      const result = await withCreator(pool,request.cookies[cookie],async ({client,creator}) => work(client,creator));
      reply.header('Cache-Control','no-store');
      if (!result) return reply.code(401).send({error:'UNAUTHENTICATED'});
      return reply.code(result.status).send(result.payload);
    } catch (error) {
      const dbError = error as {code?:string};
      if (dbError.code === '23505') return reply.code(409).send({error:'DUPLICATE_WORKSPACE'});
      if (dbError.code === '23503') return reply.code(409).send({error:'RELATION_CONFLICT'});
      return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    }
  }

  app.get('/v1/orgs',async (request,reply) => execute(request,reply,async (client,creator) => {
    const organizations = await client.query<Organization>(`SELECT o.id,o.slug,o.name,m.role
      FROM memberships m JOIN organizations o ON o.id=m.organization_id
      WHERE m.user_id=$1 AND o.archived_at IS NULL ORDER BY o.created_at,o.id`,[creator.id]);
    const preferences = await client.query<{active_organization_id:string|null}>(
      'SELECT active_organization_id FROM creator_preferences WHERE user_id=$1',[creator.id]);
    const selected = preferences.rows[0]?.active_organization_id ?? null;
    const activeOrganizationId = organizations.rows.some(o => o.id === selected)
      ? selected : organizations.rows[0]?.id ?? null;
    return ok({organizations:organizations.rows,activeOrganizationId});
  }));

  app.post('/v1/orgs',async (request,reply) => execute(request,reply,async (client,creator) => {
    const fields = validateFields(request.body,false);
    if (!fields) return fail(400,'INVALID_ORGANIZATION');
    const id = randomUUID();
    await setOrganizationContext(client,id);
    await client.query('INSERT INTO organizations(id,slug,name) VALUES($1,$2,$3)',
      [id,fields.slug,fields.name]);
    await client.query(`INSERT INTO memberships(organization_id,user_id,role)
      VALUES($1,$2,'owner')`,[id,creator.id]);
    await client.query(`INSERT INTO creator_preferences(user_id,active_organization_id)
      VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET active_organization_id=$2,updated_at=now()`,[creator.id,id]);
    await client.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,target_type,target_id)
      VALUES($1,$2,'organization.created','organization',$1)`,[id,creator.id]);
    return ok({id,slug:fields.slug,name:fields.name,role:'owner'},201);
  },true));

  app.get('/v1/orgs/:oid',async (request,reply) => execute(request,reply,async (client,creator) => {
    const {oid} = request.params as {oid:string};
    if (!uuid.test(oid)) return fail(400,'INVALID_ORGANIZATION_ID');
    const role = await membership(client,oid,creator.id);
    if (!role) return fail(404,'WORKSPACE_NOT_FOUND');
    const org = await client.query<{id:string;slug:string;name:string}>(
      'SELECT id,slug,name FROM organizations WHERE id=$1 AND archived_at IS NULL',[oid]);
    return org.rows[0] ? ok({...org.rows[0],role}) : fail(404,'WORKSPACE_NOT_FOUND');
  }));

  app.patch('/v1/orgs/:oid',async (request,reply) => execute(request,reply,async (client,creator) => {
    const {oid} = request.params as {oid:string};
    if (!uuid.test(oid)) return fail(400,'INVALID_ORGANIZATION_ID');
    const fields = validateFields(request.body,true);
    if (!fields) return fail(400,'INVALID_ORGANIZATION');
    const role = await membership(client,oid,creator.id);
    if (!role || !['owner','admin'].includes(role)) return fail(403,'INSUFFICIENT_ROLE');
    const org = await client.query<{id:string;slug:string;name:string}>(`UPDATE organizations SET
      name=COALESCE($2,name),slug=COALESCE($3,slug),updated_at=now()
      WHERE id=$1 AND archived_at IS NULL RETURNING id,slug,name`,[oid,fields.name ?? null,fields.slug ?? null]);
    if (!org.rows[0]) return fail(404,'WORKSPACE_NOT_FOUND');
    await client.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,target_type,target_id)
      VALUES($1,$2,'organization.updated','organization',$1)`,[oid,creator.id]);
    return ok({...org.rows[0],role});
  },true));

  // DELETE archives instead of destroying experiences, memberships or audit history.
  app.delete('/v1/orgs/:oid',async (request,reply) => execute(request,reply,async (client,creator) => {
    const {oid} = request.params as {oid:string};
    if (!uuid.test(oid)) return fail(400,'INVALID_ORGANIZATION_ID');
    const role = await membership(client,oid,creator.id);
    if (role !== 'owner') return fail(403,'OWNER_REQUIRED');
    await client.query('UPDATE organizations SET archived_at=now(),updated_at=now() WHERE id=$1',[oid]);
    await client.query(`UPDATE creator_preferences SET active_organization_id=NULL,updated_at=now()
      WHERE active_organization_id=$1`,[oid]);
    await client.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,target_type,target_id)
      VALUES($1,$2,'organization.archived','organization',$1)`,[oid,creator.id]);
    return ok({id:oid,archived:true});
  },true));

  app.put('/v1/workspaces/active',async (request,reply) => execute(request,reply,async (client,creator) => {
    const value = request.body as {organizationId?:unknown}|undefined;
    const oid = value?.organizationId;
    if (typeof oid !== 'string' || !uuid.test(oid)) return fail(400,'INVALID_ORGANIZATION_ID');
    if (!await membership(client,oid,creator.id)) return fail(403,'INSUFFICIENT_ROLE');
    await client.query(`INSERT INTO creator_preferences(user_id,active_organization_id)
      VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE
      SET active_organization_id=$2,updated_at=now()`,[creator.id,oid]);
    return ok({activeOrganizationId:oid});
  },true));
}
