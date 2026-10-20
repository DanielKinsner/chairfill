// SMS adapter. Demo mode never sends a real text: every message is "delivered"
// to the simulated phones in the fill timeline and tagged Simulated on screen.
// TODO(production): Twilio Programmable Messaging (Messaging Service + inbound webhook for YES/NO).

export interface SmsResult {
  id: string;
  status: "simulated" | "queued";
}

export interface SmsAdapter {
  readonly mode: "simulated" | "twilio";
  send(to: string, body: string): Promise<SmsResult>;
}

const simulated: SmsAdapter = {
  mode: "simulated",
  async send(to, body) {
    if (process.env.NODE_ENV === "development") console.debug(`[sms:simulated] to ${to}: ${body}`);
    return { id: `SM${Math.random().toString(16).slice(2, 14)}`, status: "simulated" };
  },
};

// Ships off. A real integration would read TWILIO_* keys on the server, never in the browser.
export const SMS_LIVE = process.env.NEXT_PUBLIC_SMS_LIVE === "1";

export const sms: SmsAdapter = simulated;
