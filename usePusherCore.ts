import Pusher from 'pusher-js';
import type { PusherConfig, ChannelConfig, EventConfig } from './usePusherConfig';

export interface PusherCoreOptions {
  config: PusherConfig;
  channelConfig?: ChannelConfig;
  eventConfig?: EventConfig;
  getAuthToken?: () => string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
  onStateChange?: (states: any) => void;
}

export function usePusherCore(options: PusherCoreOptions) {
  const pusher = ref<Pusher | null>(null);
  const channel = ref<any>(null);
  const isConnected = ref(false);
  const connectionState = ref<string>('disconnected');

  // Default getAuthToken function
  const defaultGetAuthToken = () => {
    if (process.client) {
      return localStorage.getItem('auth_token') || 
             useCookie('auth_token').value || 
             '';
    }
    return '';
  };

  // Get auth token function
  const getAuthToken = options.getAuthToken || defaultGetAuthToken;

  // Initialize Pusher
  const initializePusher = () => {
    if (pusher.value) return;

    const { config } = options;
    
    // Merge auth headers with Authorization token
    const authHeaders = {
      ...config.authHeaders,
      'Authorization': `Bearer ${getAuthToken()}`,
    };

    // Create new Pusher instance
    pusher.value = new Pusher(config.appKey, {
      cluster: config.cluster,
      authEndpoint: config.authEndpoint,
      auth: {
        headers: authHeaders,
      },
      ...config.options,
    });

    // Connection events
    if (pusher.value) {
      pusher.value.connection.bind('connected', () => {
        isConnected.value = true;
        connectionState.value = 'connected';
        options.onConnected?.();
      });

      pusher.value.connection.bind('disconnected', () => {
        isConnected.value = false;
        connectionState.value = 'disconnected';
        options.onDisconnected?.();
      });

      pusher.value.connection.bind('error', (error: any) => {
        isConnected.value = false;
        connectionState.value = 'error';
        options.onError?.(error);
      });

      pusher.value.connection.bind('state_change', (states: any) => {
        connectionState.value = states.current;
        isConnected.value = states.current === 'connected';
        options.onStateChange?.(states);
      });

      // Set initial connection status
      isConnected.value = pusher.value.connection.state === 'connected';
      connectionState.value = pusher.value.connection.state;
    }
  };

  // Subscribe to channel
  const subscribeToChannel = (channelName: string, customEvents?: Record<string, (data: any) => void>) => {
    if (!pusher.value) {
      return;
    }

    // Unsubscribe from previous channel if exists
    if (channel.value) {
      pusher.value.unsubscribe(channel.value.name);
    }

    try {
      channel.value = pusher.value.subscribe(channelName);
      
      const { eventConfig } = options;
      
      // Bind to subscription events
      if (eventConfig?.subscriptionError) {
        channel.value.bind(eventConfig.subscriptionError, (error: any) => {
          console.error('Pusher subscription error:', error);
          // Try to reconnect if authentication failed
          if (error.status === 403) {
            setTimeout(() => {
              initializePusher();
              subscribeToChannel(channelName, customEvents);
            }, 2000);
          }
        });
      }

      if (eventConfig?.subscriptionSucceeded) {
        channel.value.bind(eventConfig.subscriptionSucceeded, () => {
          console.log('Pusher subscription succeeded');
        });
      }

      if (eventConfig?.memberAdded) {
        channel.value.bind(eventConfig.memberAdded, (member: any) => {
          console.log('Member added:', member);
        });
      }

      if (eventConfig?.memberRemoved) {
        channel.value.bind(eventConfig.memberRemoved, (member: any) => {
          console.log('Member removed:', member);
        });
      }

      // Bind to custom events
      if (customEvents) {
        Object.entries(customEvents).forEach(([eventName, callback]) => {
          channel.value.bind(eventName, callback);
        });
      }

    } catch (error) {
      console.error('Error subscribing to channel:', error);
    }

    return channel.value;
  };

  // Bind to specific event
  const bindToEvent = (eventName: string, callback: (data: any) => void) => {
    if (!channel.value) {
      return;
    }
    
    channel.value.bind(eventName, callback);
  };

  // Unbind from specific event
  const unbindFromEvent = (eventName: string) => {
    if (channel.value) {
      channel.value.unbind(eventName);
    }
  };

  // Unsubscribe from current channel
  const unsubscribeFromChannel = () => {
    if (channel.value && pusher.value) {
      pusher.value.unsubscribe(channel.value.name);
      channel.value = null;
    }
  };

  // Disconnect Pusher
  const disconnectPusher = () => {
    if (pusher.value) {
      pusher.value.disconnect();
      pusher.value = null;
      channel.value = null;
      isConnected.value = false;
      connectionState.value = 'disconnected';
    }
  };

  // Test connection
  const testConnection = () => {
    if (!pusher.value) {
      return false;
    }
    return pusher.value.connection.state === 'connected';
  };

  // Subscribe to public channel for testing
  const subscribeToPublicChannel = (channelName: string) => {
    if (!pusher.value) {
      return;
    }

    try {
      const publicChannel = pusher.value.subscribe(channelName);
      return publicChannel;
    } catch (error) {
      console.error('Error subscribing to public channel:', error);
    }
  };

  // Cleanup on component unmount
  onUnmounted(() => {
    disconnectPusher();
  });

  return {
    // State
    pusher: readonly(pusher),
    channel: readonly(channel),
    isConnected: readonly(isConnected),
    connectionState: readonly(connectionState),
    
    // Actions
    initializePusher,
    subscribeToChannel,
    bindToEvent,
    unbindFromEvent,
    unsubscribeFromChannel,
    disconnectPusher,
    testConnection,
    subscribeToPublicChannel,
  };
} 