/**
 * قرارداد درگاه پرداخت — the contract every gateway driver implements.
 *
 * Iranian gateways all follow the same three-step dance under different names:
 *
 *   1. request  — POST amount + callback to the gateway, receive a token
 *                 (authority / trackId / id) and the URL to send the user to;
 *   2. callback — the gateway sends the user back to us with that token and
 *                 some status flag;
 *   3. verify   — POST the token back to the gateway; only a successful verify
 *                 means the money is really ours, and only then is the invoice
 *                 credited.
 *
 * Everything gateway-specific (endpoints, field names, status codes, error
 * tables) lives inside a driver; the rest of the application only ever sees
 * this interface, so adding a gateway is one file plus one line in the factory.
 */

export interface GatewayRequestInput {
  /** Our transaction uuid — passed through where the gateway supports it. */
  reference: string;
  /** Amount in تومان, as stored on the invoice. */
  amount: number;
  /** Amount in the unit the gateway charges in (usually ریال). */
  gatewayAmount: number;
  description: string;
  callbackUrl: string;
  mobile?: string | null;
  email?: string | null;
  /** Free-form extras a driver may forward (order id, national code, …). */
  metadata?: Record<string, string | number | null>;
}

export interface GatewayRequestResult {
  ok: boolean;
  /** Token the gateway identifies this payment by. */
  authority?: string;
  /** Where the browser must be sent. */
  redirectUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  /** Raw response, stored for support/debugging. */
  raw?: unknown;
}

export interface GatewayCallback {
  /** Token as returned by the gateway. */
  authority: string | null;
  /** Whether the gateway claims the user completed the payment. */
  succeeded: boolean;
  /** Gateway-specific status string, kept for the audit trail. */
  status?: string | null;
}

export interface GatewayVerifyInput {
  authority: string;
  amount: number;
  gatewayAmount: number;
  /** Everything the callback carried, for gateways that need more than a token. */
  callback: Record<string, unknown>;
}

export interface GatewayVerifyResult {
  ok: boolean;
  /** Bank reference number to show on the receipt. */
  refId?: string;
  cardPan?: string;
  /** True when the gateway says this token was already verified before. */
  alreadyVerified?: boolean;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface PaymentGateway {
  /** Stable key stored on the transaction row (`zarinpal`, `mock`, …). */
  readonly key: string;
  /** Persian label for the UI. */
  readonly label: string;
  /** True when no real money can move (mock/sandbox), shown as a banner. */
  readonly isTestMode: boolean;

  request(input: GatewayRequestInput): Promise<GatewayRequestResult>;

  /** Reads the token/status out of whatever the gateway sent back. */
  readCallback(query: Record<string, unknown>, body: Record<string, unknown>): GatewayCallback;

  verify(input: GatewayVerifyInput): Promise<GatewayVerifyResult>;
}
