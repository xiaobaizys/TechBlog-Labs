declare module 'web-push' {
  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  export function generateVAPIDKeys(): VapidKeys;
  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: Record<string, any>
  ): Promise<any>;
}
