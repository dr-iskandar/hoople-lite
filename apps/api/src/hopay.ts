/** HoPay staging adapter. Credentials never leave the API process. */
export type HopaySettings = {
  clientId: string;
  apiKey: string;
  endpoint: string;
  callbackUrl: string;
  finishUrl: string;
};

const STAGING_ENDPOINT = 'https://dev-api-payment.hoople.co.id/payment';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseHopaySettings(env: NodeJS.ProcessEnv = process.env): HopaySettings | undefined {
  const names = ['HOPAY_CLIENT_ID','HOPAY_API_KEY','HOPAY_CALLBACK_URL','HOPAY_FINISH_URL'] as const;
  if (names.every(name => !env[name])) return undefined;
  if (names.some(name => !env[name])) throw new Error('Incomplete HoPay staging configuration');
  const endpoint = env.HOPAY_ENDPOINT || STAGING_ENDPOINT;
  // Deliberately pin the outbound destination. Do not allow env-driven SSRF or live payments.
  if (endpoint !== STAGING_ENDPOINT || !UUID.test(env.HOPAY_CLIENT_ID!)
    || !/^HoPay-[A-Za-z0-9_-]{16,128}$/.test(env.HOPAY_API_KEY!)) {
    throw new Error('Invalid HoPay staging configuration');
  }
  const callback = new URL(env.HOPAY_CALLBACK_URL!);
  const finish = new URL(env.HOPAY_FINISH_URL!);
  if (callback.protocol !== 'https:' || callback.pathname !== '/v1/billing/callback'
    || callback.username || callback.password || callback.hash || callback.search
    || finish.protocol !== 'https:' || finish.username || finish.password || finish.hash) {
    throw new Error('HoPay callback and finish URLs must be secure public HTTPS URLs');
  }
  return {clientId:env.HOPAY_CLIENT_ID!,apiKey:env.HOPAY_API_KEY!,endpoint,
    callbackUrl:callback.href,finishUrl:finish.href};
}

export const STAGING_PLANS = Object.freeze({
  starter: {name:'Hoople lite Starter (staging)',price:29900},
  creator: {name:'Hoople lite Creator (staging)',price:69900},
  studio: {name:'Hoople lite Studio (staging)',price:99900},
});
export type PaidPlan = keyof typeof STAGING_PLANS;

export function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === 'string' && Object.hasOwn(STAGING_PLANS,value);
}

export function validPaymentMethod(input: unknown): input is string|string[]|undefined {
  const valid = (value:unknown) => typeof value === 'string' && /^[a-z][a-z0-9_]{1,32}$/.test(value);
  return input === undefined || valid(input)
    || (Array.isArray(input) && input.length >= 1 && input.length <= 8 && input.every(valid)
      && new Set(input).size === input.length);
}

export type PaymentRequest = {
  planId: PaidPlan;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string | string[];
};

export function paymentPayload(input: PaymentRequest, settings: HopaySettings) {
  const plan = STAGING_PLANS[input.planId];
  const items = [{id:`HPL-${input.planId.toUpperCase()}`,name:plan.name,quantity:1,price:plan.price}];
  const amount = items.reduce((sum,item)=>sum + item.price * item.quantity,0);
  return {items,amount,
    ...(input.customerName?{customerName:input.customerName}:{}),
    ...(input.customerEmail?{customerEmail:input.customerEmail}:{}),
    ...(input.customerPhone?{customerPhone:input.customerPhone}:{}),
    ...(input.paymentMethod?{paymentMethod:input.paymentMethod}:{}),
    callbackUrl:settings.callbackUrl,finishUrl:settings.finishUrl};
}

function extractRedirect(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const response = data as Record<string,unknown>;
  const fields = ['redirect_url','redirectUrl','payment_url','paymentUrl','checkout_url','checkoutUrl','snapRedirectUrl','url'];
  for (const field of fields) {
    if (typeof response[field] === 'string') return response[field];
  }
  return response.data && response.data !== data ? extractRedirect(response.data) : null;
}

export function verifiedCheckoutUrl(data: unknown): string | null {
  const candidate = extractRedirect(data);
  if (!candidate || candidate.length > 4000) return null;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.hash
      || !(['midtrans.com','hoople.co.id'].some(domain=>hostname === domain || hostname.endsWith(`.${domain}`)))) return null;
    return url.href;
  } catch { return null; }
}

export type HopayGateway = (request: PaymentRequest, settings: HopaySettings) => Promise<string>;

async function smallJsonResponse(response:Response):Promise<unknown> {
  if (Number(response.headers.get('content-length')||0) > 16_384) throw new Error('HOPAY_INVALID_RESPONSE');
  if (!response.body) throw new Error('HOPAY_INVALID_RESPONSE');
  const reader=response.body.getReader();
  const parts:Uint8Array[]=[];
  let length=0;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>16_384) throw new Error('HOPAY_INVALID_RESPONSE');
      parts.push(value);
    }
  } finally {await reader.cancel().catch(()=>undefined);}
  const bytes=new Uint8Array(length);
  let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export const createHopayCheckout: HopayGateway = async (request,settings) => {
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),10_000);
  try {
    const response = await fetch(settings.endpoint,{
      method:'POST',redirect:'error',signal:controller.signal,
      headers:{'Content-Type':'application/json','x-api-key':settings.apiKey,'x-client-id':settings.clientId},
      body:JSON.stringify(paymentPayload(request,settings)),
    });
    // Limit response size and do not surface upstream bodies (they might contain secrets).
    if (!response.ok) throw new Error('HOPAY_UNAVAILABLE');
    const parsed = await smallJsonResponse(response);
    const checkoutUrl = verifiedCheckoutUrl(parsed);
    if (!checkoutUrl) throw new Error('HOPAY_INVALID_RESPONSE');
    return checkoutUrl;
  } finally { clearTimeout(timeout); }
};
