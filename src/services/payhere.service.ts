import crypto from 'crypto';
import { AppError } from '../utils/errors';
import { PayHereNotifyDto } from '../dtos/booking.dto';

interface PayHereCheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

interface BuildCheckoutSessionInput {
  orderId: string;
  amount: number;
  items: string;
  customer: PayHereCheckoutCustomer;
  custom1?: string;
  custom2?: string;
}

interface PayHereConfig {
  merchantId: string;
  merchantSecret: string;
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
  currency: string;
  checkoutUrl: string;
}

const DEFAULT_PHONE = '0770000000';
const DEFAULT_ADDRESS = 'N/A';
const DEFAULT_CITY = 'Colombo';
const DEFAULT_COUNTRY = 'Sri Lanka';

export class PayHereService {
  ensureConfigured() {
    this.getConfig();
  }

  getCurrency() {
    return this.getConfig().currency;
  }

  normalizeAmount(value: string): string | null {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return null;
    return this.formatAmount(amount);
  }

  private getConfig(): PayHereConfig {
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const notifyUrl = process.env.PAYHERE_NOTIFY_URL;
    const returnUrl = process.env.PAYHERE_RETURN_URL;
    const cancelUrl = process.env.PAYHERE_CANCEL_URL;

    if (!merchantId || !merchantSecret || !notifyUrl || !returnUrl || !cancelUrl) {
      throw new AppError(
        500,
        'PayHere is not configured. Missing PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET, PAYHERE_NOTIFY_URL, PAYHERE_RETURN_URL or PAYHERE_CANCEL_URL',
      );
    }

    const sandbox = (process.env.PAYHERE_SANDBOX || 'true').toLowerCase() !== 'false';
    const checkoutUrl =
      process.env.PAYHERE_CHECKOUT_URL ||
      (sandbox
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout');

    const currency = (process.env.PAYHERE_CURRENCY || 'LKR').toUpperCase();

    return {
      merchantId,
      merchantSecret,
      notifyUrl,
      returnUrl,
      cancelUrl,
      currency,
      checkoutUrl,
    };
  }

  private md5Upper(value: string): string {
    return crypto.createHash('md5').update(value).digest('hex').toUpperCase();
  }

  private formatAmount(amount: number): string {
    return Number(amount).toFixed(2);
  }

  private normalizeText(value: string | undefined, fallback: string): string {
    const cleaned = value?.trim();
    return cleaned && cleaned.length > 0 ? cleaned : fallback;
  }

  buildCheckoutSession(input: BuildCheckoutSessionInput) {
    const config = this.getConfig();
    const amount = this.formatAmount(input.amount);
    const hashedSecret = this.md5Upper(config.merchantSecret);
    const hash = this.md5Upper(
      `${config.merchantId}${input.orderId}${amount}${config.currency}${hashedSecret}`,
    );

    const payload = {
      merchant_id: config.merchantId,
      return_url: config.returnUrl,
      cancel_url: config.cancelUrl,
      notify_url: config.notifyUrl,
      first_name: this.normalizeText(input.customer.firstName, 'Customer'),
      last_name: this.normalizeText(input.customer.lastName, 'User'),
      email: this.normalizeText(input.customer.email, 'customer@example.com'),
      phone: this.normalizeText(input.customer.phone, DEFAULT_PHONE),
      address: this.normalizeText(input.customer.address, DEFAULT_ADDRESS),
      city: this.normalizeText(input.customer.city, DEFAULT_CITY),
      country: this.normalizeText(input.customer.country, DEFAULT_COUNTRY),
      order_id: input.orderId,
      items: input.items,
      currency: config.currency,
      amount,
      custom_1: input.custom1 || '',
      custom_2: input.custom2 || '',
      hash,
    };

    return {
      gateway: 'payhere' as const,
      method: 'POST' as const,
      action: config.checkoutUrl,
      payload,
    };
  }

  verifyNotification(dto: PayHereNotifyDto): boolean {
    const config = this.getConfig();

    if (!dto.merchant_id || !dto.order_id || !dto.payhere_amount || !dto.payhere_currency) {
      return false;
    }

    if (!dto.status_code || !dto.md5sig) {
      return false;
    }

    if (dto.merchant_id !== config.merchantId) {
      return false;
    }

    const hashedSecret = this.md5Upper(config.merchantSecret);
    const localSig = this.md5Upper(
      `${dto.merchant_id}${dto.order_id}${dto.payhere_amount}${dto.payhere_currency}${dto.status_code}${hashedSecret}`,
    );

    return localSig === dto.md5sig.toUpperCase();
  }
}
