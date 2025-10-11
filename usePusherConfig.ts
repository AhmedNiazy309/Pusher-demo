export interface PusherConfig {
  appKey: string;
  cluster: string;
  authEndpoint: string;
  authHeaders?: Record<string, string>;
  options?: {
    activityTimeout?: number;
    pongTimeout?: number;
    forceTLS?: boolean;
    [key: string]: any;
  };
}

export interface ChannelConfig {
  prefix: string;
  separator?: string;
}

export interface EventConfig {
  newMessage: string;
  memberAdded?: string;
  memberRemoved?: string;
  subscriptionSucceeded?: string;
  subscriptionError?: string;
}

export const usePusherConfig = () => {
  // Default configuration - يمكن تغييرها حسب المشروع
  const defaultConfig: PusherConfig = {
    appKey: 'YOUR_PUSHER_APP_KEY',
    cluster: 'eu',
    authEndpoint: 'https://your-domain.com/api/broadcasting/auth',
    authHeaders: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    options: {
      activityTimeout: 30000,
      pongTimeout: 15000,
      forceTLS: true,
    }
  };

  // Default channel configuration
  const defaultChannelConfig: ChannelConfig = {
    prefix: 'private',
    separator: '-'
  };

  // Default event configuration
  const defaultEventConfig: EventConfig = {
    newMessage: 'new-message',
    memberAdded: 'pusher:member_added',
    memberRemoved: 'pusher:member_removed',
    subscriptionSucceeded: 'pusher:subscription_succeeded',
    subscriptionError: 'pusher:subscription_error'
  };

  return {
    defaultConfig,
    defaultChannelConfig,
    defaultEventConfig
  };
}; 