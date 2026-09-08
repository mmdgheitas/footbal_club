import axios from 'axios';

jest.mock('axios');

/**
 * درگاه بیت‌پی — the wire format, verified against the official contract:
 *
 *   POST /payment/gateway-send            api, amount(ریال), redirect, factorId
 *        → a bare number: > 0 is id_get, < 0 is an error code
 *   redirect  /payment/gateway-{id_get}-get
 *   callback  ?trans_id=…&id_get=…&factorId=…
 *   POST /payment/gateway-result-second   api, id_get, trans_id, json=1
 *        → { status, amount, cardNum, factorId }, 1 = paid, 11 = already verified
 *
 * The driver reads its API key from the constants module, which snapshots the
 * environment at import time — so each case loads the module in isolation with
 * the environment it needs.
 */

interface Loaded {
  driver: {
    key: string;
    label: string;
    isTestMode: boolean;
    request: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    readCallback: (
      query: Record<string, unknown>,
      body: Record<string, unknown>,
    ) => { authority: string | null; succeeded: boolean; status: string | null };
    verify: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  post: jest.Mock;
}

const ORIGINAL_ENV = { ...process.env };

function load(env: Record<string, string> = {}): Loaded {
  let loaded: Loaded | null = null;

  jest.isolateModules(() => {
    process.env.PAYMENT_GATEWAY = 'bitpay';
    process.env.PAYMENT_MODE = env.PAYMENT_MODE ?? 'production';
    process.env.PAYMENT_MERCHANT_ID = env.PAYMENT_MERCHANT_ID ?? 'TEST-API-KEY';
    process.env.BITPAY_BASE_URL = env.BITPAY_BASE_URL ?? 'https://bitpay.ir';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BitpayGateway } = require('../src/modules/payments/gateways/bitpay.gateway');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const http = require('axios');
    loaded = { driver: new BitpayGateway(), post: http.post as jest.Mock };
  });

  return loaded as unknown as Loaded;
}

/** The driver posts `application/x-www-form-urlencoded`; read it back. */
function sentForm(post: jest.Mock, call = 0): URLSearchParams {
  return new URLSearchParams(String(post.mock.calls[call][1]));
}

beforeEach(() => {
  (axios.post as jest.Mock).mockReset();
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('bitpay — درخواست پرداخت (gateway-send)', () => {
  const input = {
    reference: '9c1f0f2e-1a44-4f1e-9a1b-3c0d5b7e8a11',
    amount: 250000,
    gatewayAmount: 2500000, // ریال
    description: 'شهریه فصل زمستان',
    callbackUrl: 'https://club.example.com/payments/callback/bitpay',
    mobile: '09120000021',
    metadata: { payment_id: 41, player_id: 1 },
  };

  it('sends the documented fields and returns the token plus the redirect URL', async () => {
    const { driver, post } = load();
    post.mockResolvedValueOnce({ data: '  4238211  ' });

    const result = await driver.request(input);

    expect(post.mock.calls[0][0]).toBe('https://bitpay.ir/payment/gateway-send');
    const form = sentForm(post);
    expect(form.get('api')).toBe('TEST-API-KEY');
    expect(form.get('amount')).toBe('2500000'); // ریال, not تومان
    expect(form.get('redirect')).toBe(input.callbackUrl);
    expect(form.get('factorId')).toBe('41'); // the invoice id, visible in the panel
    expect(form.get('description')).toBe('شهریه فصل زمستان');
    expect(post.mock.calls[0][2].headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );

    expect(result.ok).toBe(true);
    expect(result.authority).toBe('4238211');
    expect(result.redirectUrl).toBe('https://bitpay.ir/payment/gateway-4238211-get');
  });

  it('translates every documented purchase error code', async () => {
    const cases: Array<[string, string]> = [
      ['-1', 'کلید API'],
      ['-2', 'مبلغ نامعتبر'],
      ['-3', 'آدرس بازگشت'],
      ['-4', 'درگاهی با این مشخصات'],
      ['-5', 'خطا در اتصال'],
    ];

    for (const [code, fragment] of cases) {
      const { driver, post } = load();
      post.mockResolvedValueOnce({ data: code });

      const result = await driver.request(input);

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe(code);
      expect(String(result.errorMessage)).toContain(fragment);
    }
  });

  it('never calls the gateway without an API key', async () => {
    const { driver, post } = load({ PAYMENT_MERCHANT_ID: '' });

    const result = await driver.request(input);

    expect(post).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('NO_API_KEY');
  });

  it('reports a network failure as a payer-friendly error', async () => {
    const { driver, post } = load();
    post.mockRejectedValueOnce(new Error('ETIMEDOUT'));

    const result = await driver.request(input);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('NETWORK');
  });
});

describe('bitpay — بازگشت از درگاه', () => {
  it('keys the attempt by id_get and treats a positive trans_id as paid', () => {
    const { driver } = load();

    const callback = driver.readCallback(
      { trans_id: '77112233', id_get: '4238211', factorId: '41' },
      {},
    );

    expect(callback.authority).toBe('4238211');
    expect(callback.succeeded).toBe(true);
  });

  it('treats a missing or negative trans_id as not paid', () => {
    const { driver } = load();

    expect(driver.readCallback({ id_get: '4238211' }, {}).succeeded).toBe(false);
    expect(driver.readCallback({ id_get: '4238211', trans_id: '-1' }, {}).succeeded).toBe(false);
    expect(driver.readCallback({ id_get: '4238211', trans_id: '0' }, {}).succeeded).toBe(false);
  });

  it('also reads the values when BitPay posts them', () => {
    const { driver } = load();
    const callback = driver.readCallback({}, { trans_id: '77112233', id_get: '4238211' });
    expect(callback.authority).toBe('4238211');
    expect(callback.succeeded).toBe(true);
  });
});

describe('bitpay — تأیید پرداخت (gateway-result-second)', () => {
  const verifyInput = {
    authority: '4238211',
    amount: 250000,
    gatewayAmount: 2500000,
    callback: { trans_id: '77112233', id_get: '4238211' },
  };

  it('sends api/id_get/trans_id/json and accepts status 1', async () => {
    const { driver, post } = load();
    post.mockResolvedValueOnce({
      data: { status: 1, amount: 2500000, cardNum: '621986******1234', factorId: 41 },
    });

    const result = await driver.verify(verifyInput);

    expect(post.mock.calls[0][0]).toBe('https://bitpay.ir/payment/gateway-result-second');
    const form = sentForm(post);
    expect(form.get('api')).toBe('TEST-API-KEY');
    expect(form.get('id_get')).toBe('4238211');
    expect(form.get('trans_id')).toBe('77112233');
    expect(form.get('json')).toBe('1');

    expect(result.ok).toBe(true);
    expect(result.refId).toBe('77112233');
    expect(result.cardPan).toBe('621986******1234');
    expect(result.alreadyVerified).toBeFalsy();
  });

  it('treats status 11 as an already verified transaction, not a failure', async () => {
    const { driver, post } = load();
    post.mockResolvedValueOnce({ data: { status: 11, amount: 2500000, cardNum: null } });

    const result = await driver.verify(verifyInput);

    expect(result.ok).toBe(true);
    expect(result.alreadyVerified).toBe(true);
  });

  it('refuses to confirm when the paid amount differs from the invoice', async () => {
    const { driver, post } = load();
    post.mockResolvedValueOnce({ data: { status: 1, amount: 10000, cardNum: null } });

    const result = await driver.verify(verifyInput);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('AMOUNT_MISMATCH');
  });

  it('translates the documented verify error codes', async () => {
    const cases: Array<[number, string]> = [
      [-1, 'کلید API'],
      [-2, 'شناسه تراکنش'],
      [-3, 'شناسه پرداخت'],
      [-4, 'چنین تراکنشی'],
    ];

    for (const [status, fragment] of cases) {
      const { driver, post } = load();
      post.mockResolvedValueOnce({ data: { status } });

      const result = await driver.verify(verifyInput);

      expect(result.ok).toBe(false);
      expect(String(result.errorMessage)).toContain(fragment);
    }
  });

  it('parses a JSON body that arrives as text', async () => {
    const { driver, post } = load();
    post.mockResolvedValueOnce({ data: '{"status":1,"amount":2500000,"cardNum":"6037"}' });

    const result = await driver.verify(verifyInput);

    expect(result.ok).toBe(true);
    expect(result.cardPan).toBe('6037');
  });

  it('does not call the gateway without a trans_id', async () => {
    const { driver, post } = load();

    const result = await driver.verify({ ...verifyInput, callback: {} });

    expect(post).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('NO_TRANS_ID');
  });

  it('is in test mode unless PAYMENT_MODE=production', () => {
    expect(load({ PAYMENT_MODE: 'sandbox' }).driver.isTestMode).toBe(true);
    expect(load({ PAYMENT_MODE: 'production' }).driver.isTestMode).toBe(false);
  });
});
