import test from 'node:test';
import assert from 'node:assert/strict';
import {createHopayCheckout,parseHopaySettings,paymentPayload,verifiedCheckoutUrl,validPaymentMethod} from '../src/hopay.js';

const env={
  HOPAY_CLIENT_ID:'a189669e-a650-41cb-a2ba-7d56bb40dbbe',
  HOPAY_API_KEY:'HoPay-HP-abcdefghij1234567890',
  HOPAY_CALLBACK_URL:'https://api-staging.example.com/v1/billing/callback',
  HOPAY_FINISH_URL:'https://studio.example.com/?payment=return',
};

test('HoPay settings reject incomplete configs, insecure URLs and outbound SSRF',()=>{
  assert.equal(parseHopaySettings({}),undefined);
  assert.throws(()=>parseHopaySettings({HOPAY_CLIENT_ID:env.HOPAY_CLIENT_ID}),/Incomplete/);
  assert.throws(()=>parseHopaySettings({...env,HOPAY_ENDPOINT:'https://evil.test/steal'}),/Invalid/);
  assert.throws(()=>parseHopaySettings({...env,HOPAY_CALLBACK_URL:'http://localhost/v1/billing/callback'}),/HTTPS/);
  assert.throws(()=>parseHopaySettings({...env,HOPAY_CALLBACK_URL:'https://api-staging.example.com/other'}),/HTTPS/);
  assert.equal(parseHopaySettings(env)?.endpoint,'https://dev-api-payment.hoople.co.id/payment');
});

test('HoPay amount is server-computed and equals the item subtotal',()=>{
  const settings=parseHopaySettings(env)!;
  for (const [planId,price] of [['starter',29900],['creator',69900],['studio',99900]] as const) {
    const payload=paymentPayload({planId},settings);
    assert.equal(payload.amount,price);
    assert.equal(payload.amount,payload.items.reduce((total,item)=>total+item.price*item.quantity,0));
    assert.equal(payload.callbackUrl,settings.callbackUrl);
    assert.equal(payload.finishUrl,settings.finishUrl);
  }
  assert.equal(validPaymentMethod(['bca_va','gopay']),true);
  assert.equal(validPaymentMethod(['gopay','gopay']),false);
  assert.equal(validPaymentMethod('../escape'),false);
});

test('checkout URL rejects non-HTTPS redirects and external hosts',()=>{
  assert.equal(verifiedCheckoutUrl({data:{redirect_url:'https://app.sandbox.midtrans.com/snap/v4/redirection/ok'}}),
    'https://app.sandbox.midtrans.com/snap/v4/redirection/ok');
  assert.equal(verifiedCheckoutUrl({redirectUrl:'https://evil.example.com/pay'}),null);
  assert.equal(verifiedCheckoutUrl({checkoutUrl:'https://midtrans.com.evil.test/steal'}),null);
  assert.equal(verifiedCheckoutUrl({url:'javascript:alert(1)'}),null);
  assert.equal(verifiedCheckoutUrl({url:'http://dev-api-payment.hoople.co.id/steal'}),null);
});

test('adapter sends server credentials and validates provider response',async()=>{
  const original=globalThis.fetch;
  const requests:{url:string;init:RequestInit}[]=[];
  globalThis.fetch=async(url,init)=>{
    requests.push({url:String(url),init:init!});
    return new Response(JSON.stringify({data:{redirect_url:'https://app.sandbox.midtrans.com/snap/v4/redirection/session'}}),
      {status:201,headers:{'content-type':'application/json'}});
  };
  try {
    const settings=parseHopaySettings(env)!;
    const url=await createHopayCheckout({planId:'starter',customerEmail:'creator@example.test'},settings);
    assert.match(url,/midtrans\.com/);
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,settings.endpoint);
    assert.equal((requests[0].init.headers as Record<string,string>)['x-client-id'],settings.clientId);
    assert.equal((requests[0].init.headers as Record<string,string>)['x-api-key'],settings.apiKey);
    const payload=JSON.parse(String(requests[0].init.body));
    assert.equal(payload.amount,29900);
    assert.equal(payload.items[0].quantity,1);
    assert.equal(payload.customerEmail,'creator@example.test');
    assert.equal(payload.callbackUrl,settings.callbackUrl);
    assert.ok(!String(requests[0].init.body).includes(settings.apiKey));
  } finally {globalThis.fetch=original;}
});
