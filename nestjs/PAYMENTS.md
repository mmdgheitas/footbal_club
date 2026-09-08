# سامانه پرداخت آنلاین — Payment system & gateway

An invoice ledger plus a pluggable online gateway. The gateway itself is one
small file behind an interface, so swapping or adding a provider never touches
the rest of the application.

---

## 1. جریان پرداخت

```
 صورتحساب (fc_payments)                     تلاش پرداخت (fc_payment_transactions)
        │                                                │
 admin/invoices  ──issues──▶  pending  ──POST /payments/start/:id──▶ initiated
        │                                                │ gateway.request()
        │                                                ▼
        │                                             pending ──▶ [ درگاه / bank ]
        │                                                │
        │                       GET|POST /payments/callback/:gateway
        │                                                ▼
        │                                       paid ──gateway.verify()──▶ verified
        │                                                │            └──▶ failed
        ▼                                                ▼
   completed  ◀── credited once, inside one DB transaction, with the
                  double-entry rows in fc_transaction_logs
```

Guarantees, all covered by `test/payments.spec.ts`:

| Rule | How |
| --- | --- |
| The amount always comes from the invoice | `PaymentService.start()` reads `fc_payments.amount`; the request only names an invoice id |
| A payer can only pay what is theirs | guardian → `fc_player_guardians`, player → own `player_id`; checked before an attempt exists |
| Only a verified callback credits | the invoice is touched exclusively in `creditInvoice()`, after `gateway.verify()` returns ok |
| Crediting happens at most once | `UNIQUE (gateway, authority)`, the `verified` short-circuit, and a `status = completed` guard inside the transaction |
| A replayed callback is a no-op | second call returns `already_verified` and writes nothing |
| Cancelled/failed attempts never touch the invoice | they only move the transaction row to `canceled` / `failed` |
| The callback is not trusted | its status flag is recorded, then the gateway is asked directly |

## 2. مسیرها

| Route | Who | Purpose |
| --- | --- | --- |
| `POST /payments/start/:paymentId` | ولی، بازیکن، مدیر/حسابدار | open an attempt, redirect to the gateway |
| `GET\|POST /payments/callback/:gateway` | public | the gateway returns the payer (session-independent by design) |
| `GET /payments/result/:id` | public | receipt with ref id / reason for failure + «تلاش دوباره» |
| `GET\|POST /payments/mock/:authority` | public, simulator only | the local stand-in for the bank page |
| `GET /admin/invoices` | super_admin, accountant | issue + review invoices |
| `POST /admin/invoices` | super_admin, accountant | issue one (notifies guardian and player) |
| `POST /admin/invoices/:id/cancel` | super_admin | withdraw an unpaid invoice |
| `GET /admin/payments` | `view_payment_transactions` / `view_financial_reports` | every attempt with its gateway trace |

Pay buttons live where the money is already shown: **پنل ولی → دفترچه مالی** and
**اپ بازیکن → پروفایل**. Coaches reach none of it (403), unchanged from the
access rules in `FEATURE_EXPANSION.md` §7.

## 3. درگاه بیت‌پی (bitpay.ir)

The driver in `src/modules/payments/gateways/bitpay.gateway.ts` implements the
official protocol exactly:

| Step | Call |
| --- | --- |
| ۱. درخواست | `POST https://bitpay.ir/payment/gateway-send` — `api`, `amount` (**ریال**), `redirect`, `factorId`, `name`, `email`, `description` → a bare number: `> 0` is `id_get`, negative is an error (`-1` … `-5`) |
| ۲. انتقال کاربر | `https://bitpay.ir/payment/gateway-{id_get}-get` |
| ۳. بازگشت | BitPay returns to `redirect` with `trans_id`, `id_get`, `factorId` |
| ۴. تأیید | `POST https://bitpay.ir/payment/gateway-result-second` — `api`, `id_get`, `trans_id`, `json=1` → `{status, amount, cardNum, factorId}`; `status = 1` paid, `status = 11` already verified |

Mapping onto this codebase:

* `authority` = **id_get** (the attempt is looked up by it, and it is unique per
  gateway), `ref_id` on the receipt = **trans_id**, `card_pan` = **cardNum**;
* `factorId` = the invoice id, so the BitPay panel shows the same number the
  club sees in `/admin/invoices`;
* amounts go out in **ریال** (`PAYMENT_CURRENCY_MULTIPLIER=10`), and the amount
  BitPay reports back on verify is compared with the invoice — a mismatch is
  refused instead of credited;
* `status = 11` (already verified) is treated as success without crediting a
  second time, so a replayed callback is harmless;
* all documented error codes are translated to Persian for the payer
  (`-1` API mismatch, `-2` bad amount, `-3` empty redirect, `-4` gateway not
  approved, `-5` connection error; on verify `-1` … `-4`).

Configuration:

```bash
PAYMENT_GATEWAY=bitpay
PAYMENT_MODE=production          # BitPay has no public sandbox
PAYMENT_MERCHANT_ID=<کلید API>   # پنل بیت‌پی ← مدیریت درگاه ← API
PAYMENT_CALLBACK_URL=https://your-domain        # must match the approved gateway URL
PAYMENT_CURRENCY_MULTIPLIER=10   # تومان → ریال
```

`PAYMENT_API_KEY` is accepted as an alias for the key, since BitPay calls it
«API» rather than «merchant id». Two things to check in the BitPay panel before
going live: the gateway must be **approved** (otherwise `gateway-send` answers
`-4`), and the return address must match `PAYMENT_CALLBACK_URL`
(`https://your-domain/payments/callback/bitpay`).

BitPay publishes no sandbox, so testing is either `PAYMENT_MODE=mock` (the
simulator, §6) or a real transaction of the minimum amount. `BITPAY_BASE_URL`
overrides the host if you ever need to point the driver at a proxy.

## 4. افزودن یک درگاه جدید

Three steps, nothing else in the codebase changes:

1. `src/modules/payments/gateways/<name>.gateway.ts` — implement
   `PaymentGateway` (`request`, `readCallback`, `verify`). Two references ship:
   `bitpay.gateway.ts` (form-encoded, numeric responses) and
   `zarinpal.gateway.ts` (JSON REST v4).
2. Add the class to `providers` in `payments.module.ts`.
3. Add one line to `drivers` in `payment-gateway.factory.ts`.

```ts
export class MyGateway implements PaymentGateway {
  readonly key = 'mygw';
  readonly label = 'درگاه من';
  get isTestMode() { return PAYMENT_MODE !== 'production'; }

  async request(input) { /* POST amount + callbackUrl → { authority, redirectUrl } */ }
  readCallback(query, body) { /* → { authority, succeeded } */ }
  async verify(input) { /* POST token → { ok, refId, cardPan } */ }
}
```

Amounts: `input.amount` is تومان (what the club stores and displays) and
`input.gatewayAmount` is already multiplied by `PAYMENT_CURRENCY_MULTIPLIER`
(10 → ریال). Use whichever the gateway expects.

## 5. تنظیمات

```bash
PAYMENT_GATEWAY=mock            # mock | bitpay | zarinpal | <your driver>
PAYMENT_MODE=mock               # mock | sandbox | production
PAYMENT_MERCHANT_ID=            # required for production
PAYMENT_API_KEY=
PAYMENT_CALLBACK_URL=           # public origin; empty = origin of the request
PAYMENT_CURRENCY_MULTIPLIER=10  # تومان → ریال
PAYMENT_MIN_AMOUNT=1000
PAYMENT_TIMEOUT=900
```

Two guard rails in `PaymentGatewayFactory`:

* an unknown `PAYMENT_GATEWAY` falls back to the simulator and logs a warning;
* a real driver with no `PAYMENT_MERCHANT_ID` / `PAYMENT_API_KEY` is refused and
  the simulator is used instead — a misconfigured deployment cannot silently
  send payers to a broken gateway.

`PAYMENT_MODE=mock` also makes `/payments/mock/*` (the fake bank page) reachable;
with any real driver active those routes answer 404, so they can never be used
to fake a payment.

## 6. پایگاه داده

`fc_payment_transactions` — one row per attempt: gateway, mode, amount +
`gateway_amount`, `authority`, `ref_id`, `card_pan`, status, payer
(`guardian|player|admin|system`), the raw request/response payloads,
`callback_ip`, `verified_at`. `UNIQUE (gateway, authority)`.

`fc_payments` gained `due_date`, `created_by` and `paid_at`.

* fresh install → `database/schema.sql` already contains both;
* existing database → `database/migrations/007_payment_gateway.sql` (additive).

`scripts/check-schema-parity.ts`: **363 / 363** columns matching across 31
entities.

## 7. آزمایش بدون حساب پذیرنده

`PAYMENT_MODE=mock` (the default) gives a real three-step flow with a local bank
page — pay or cancel — so the callback, the verify guard, the ledger entries and
the notifications are all exercised without a merchant account:

```bash
cd nestjs
DB_CONNECTION=sqlite DB_SQLITE_PATH=../database/football_club.dev.sqlite \
  npx ts-node scripts/seed-demo.ts
DB_CONNECTION=sqlite DB_SQLITE_PATH=../database/football_club.dev.sqlite \
  SMS_PROVIDER=mock PAYMENT_MODE=mock npx ts-node src/main.ts
```

Log in as ولی `09120000021`, open **دفترچه مالی**, press **پرداخت**.

## 8. اعلان‌ها و دفتر مالی

A verified payment writes in-panel notifications for the player, the guardian
and the finance staff, retires the debt reminders that are no longer true, and
adds the credit/debit pair to `fc_transaction_logs` — so
`/admin/reports/financial`, `/admin/reports/debtors` and the guardian's ledger
all reflect it immediately, exactly like a manually recorded payment.
