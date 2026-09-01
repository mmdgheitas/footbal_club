import axios from 'axios';

/**
 * Port of app/Helpers/SmsProvider.php.
 *
 * The abstract base plus the Twilio, Nexmo and Mock implementations. The
 * legacy code uses file_get_contents() with a stream context; axios is the
 * equivalent here. Return shapes are identical:
 *   { success: boolean, message_id: string | null, error: string | null }
 */

export interface SmsResult {
  success: boolean;
  message_id: string | null;
  error: string | null;
}

export abstract class SmsProvider {
  protected apiKey: string;
  protected apiSecret: string;
  protected fromNumber: string;

  constructor(apiKey: string, apiSecret: string, fromNumber: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.fromNumber = fromNumber;
  }

  abstract send(toNumber: string, message: string): Promise<SmsResult>;
  abstract checkStatus(messageId: string): Promise<string>;

  /** SmsProvider::validatePhoneNumber() - E.164 after stripping non-digits. */
  validatePhoneNumber(phoneNumber: string): boolean {
    return /^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/\D/g, ''));
  }

  /** SmsProvider::formatPhoneNumber() */
  formatPhoneNumber(phoneNumber: string): string {
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (cleaned.indexOf('+') !== 0) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }
}

export class TwilioSmsProvider extends SmsProvider {
  private static readonly API_URL =
    'https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json';

  async send(toNumber: string, message: string): Promise<SmsResult> {
    if (!this.validatePhoneNumber(toNumber)) {
      return { success: false, message_id: null, error: 'Invalid phone number format' };
    }

    const formatted = this.formatPhoneNumber(toNumber);
    const url = TwilioSmsProvider.API_URL.replace('{account_sid}', this.apiKey);

    const postData = new URLSearchParams({
      From: this.fromNumber,
      To: formatted,
      Body: message,
    }).toString();

    try {
      const response = await axios.post(url, postData, {
        headers: {
          'Content-type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' + Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64'),
        },
        // The legacy file_get_contents() throws on non-2xx, which lands in catch().
        validateStatus: () => true,
      });
      const data = response.data;

      if (data && data.sid !== undefined) {
        return { success: true, message_id: data.sid, error: null };
      }

      return {
        success: false,
        message_id: null,
        error: data?.message ?? 'Unknown error',
      };
    } catch (e: any) {
      return { success: false, message_id: null, error: e.message };
    }
  }

  async checkStatus(messageId: string): Promise<string> {
    const url =
      TwilioSmsProvider.API_URL.replace('{account_sid}', this.apiKey) +
      '/' +
      messageId +
      '.json';

    try {
      const response = await axios.get(url, {
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64'),
        },
        validateStatus: () => true,
      });
      return response.data?.status ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

export class NexmoSmsProvider extends SmsProvider {
  private static readonly API_URL = 'https://rest.nexmo.com/sms/json';

  async send(toNumber: string, message: string): Promise<SmsResult> {
    if (!this.validatePhoneNumber(toNumber)) {
      return { success: false, message_id: null, error: 'Invalid phone number format' };
    }

    const formatted = this.formatPhoneNumber(toNumber);

    const params = new URLSearchParams({
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      to: formatted,
      from: this.fromNumber,
      text: message,
    }).toString();

    const url = `${NexmoSmsProvider.API_URL}?${params}`;

    try {
      const response = await axios.get(url, { validateStatus: () => true });
      const data = response.data;

      if (data?.messages?.[0]?.status !== undefined && data.messages[0].status == 0) {
        return {
          success: true,
          message_id: data.messages[0].message_id,
          error: null,
        };
      }

      return {
        success: false,
        message_id: null,
        error: data?.messages?.[0]?.error_text ?? 'Unknown error',
      };
    } catch (e: any) {
      return { success: false, message_id: null, error: e.message };
    }
  }

  async checkStatus(_messageId: string): Promise<string> {
    // Nexmo doesn't provide real-time status check via simple API.
    return 'sent';
  }
}

export class MockSmsProvider extends SmsProvider {
  private logFile: string;

  constructor(
    apiKey: string,
    apiSecret: string,
    fromNumber: string,
    logFile = '',
  ) {
    super(apiKey, apiSecret, fromNumber);
    const fs = require('fs');
    const path = require('path');
    if (logFile !== '') {
      this.logFile = logFile;
    } else if (process.env.BASE_PATH) {
      this.logFile = path.join(process.env.BASE_PATH, 'storage', 'logs', 'sms_mock.log');
    } else {
      this.logFile = path.join(require('os').tmpdir(), 'sms_mock.log');
    }
    void fs;
  }

  async send(toNumber: string, message: string): Promise<SmsResult> {
    const fs = require('fs');
    const messageId = 'MOCK_' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10);

    const p = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
      d.getHours(),
    )}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

    const logEntry = `[${stamp}] To: ${toNumber} | From: ${this.fromNumber} | Message: ${message}\n`;

    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch {
      // The legacy file_put_contents() failure is not checked either.
    }

    return { success: true, message_id: messageId, error: null };
  }

  async checkStatus(_messageId: string): Promise<string> {
    return 'delivered';
  }
}
