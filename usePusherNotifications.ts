import type { PusherCoreOptions } from './usePusherCore';
import { usePusherCore } from './usePusherCore';
import { usePusherConfig } from './usePusherConfig';

export interface Notification {
  id: string | number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  created_at: string;
  read?: boolean;
}

export interface NotificationOptions extends PusherCoreOptions {
  channelPrefix?: string;
  channelSeparator?: string;
  notificationEvent?: string;
  onNewNotification?: (notification: Notification) => void;
  onNotificationRead?: (notificationId: string | number) => void;
  onNotificationError?: (error: any) => void;
}

export function usePusherNotifications(options: NotificationOptions) {
  const { defaultConfig, defaultChannelConfig, defaultEventConfig } = usePusherConfig();
  
  // Merge configurations
  const config = {
    ...defaultConfig,
    ...options.config,
  };

  const channelConfig = {
    ...defaultChannelConfig,
    prefix: options.channelPrefix || defaultChannelConfig.prefix,
    separator: options.channelSeparator || defaultChannelConfig.separator,
  };

  const eventConfig = {
    ...defaultEventConfig,
    newMessage: options.notificationEvent || 'new-notification',
  };

  // Use the core Pusher composable
  const {
    pusher,
    channel,
    isConnected,
    connectionState,
    initializePusher,
    subscribeToChannel,
    bindToEvent,
    unbindFromEvent,
    unsubscribeFromChannel,
    disconnectPusher,
    testConnection,
  } = usePusherCore({
    config,
    channelConfig,
    eventConfig,
    getAuthToken: options.getAuthToken,
    onConnected: options.onConnected,
    onDisconnected: options.onDisconnected,
    onError: options.onError,
    onStateChange: options.onStateChange,
  });

  // Notification-specific state
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const isSubscribed = ref(false);

  // Generate channel name for user notifications
  const generateUserChannelName = (userId: string | number) => {
    return `${channelConfig.prefix}${channelConfig.separator}user${channelConfig.separator}${userId}`;
  };

  // Generate channel name for general notifications
  const generateGeneralChannelName = () => {
    return `${channelConfig.prefix}${channelConfig.separator}notifications`;
  };

  // Subscribe to user notifications
  const subscribeToUserNotifications = async (userId: string | number) => {
    if (!userId) return;

    const channelName = generateUserChannelName(userId);

    // Custom events for notifications
    const customEvents = {
      [eventConfig.newMessage]: (data: any) => {
        if (data.notification) {
          const notification = data.notification as Notification;
          
          // Check if notification already exists
          const notificationExists = notifications.value.some(n => n.id === notification.id);
          if (!notificationExists) {
            // Add new notification to the beginning of the array
            notifications.value.unshift(notification);
            unreadCount.value++;
            options.onNewNotification?.(notification);
          }
        }
      }
    };

    // Subscribe to channel
    const result = subscribeToChannel(channelName, customEvents);
    isSubscribed.value = !!result;
    
    return result;
  };

  // Subscribe to general notifications
  const subscribeToGeneralNotifications = async () => {
    const channelName = generateGeneralChannelName();

    // Custom events for general notifications
    const customEvents = {
      [eventConfig.newMessage]: (data: any) => {
        if (data.notification) {
          const notification = data.notification as Notification;
          
          // Check if notification already exists
          const notificationExists = notifications.value.some(n => n.id === notification.id);
          if (!notificationExists) {
            // Add new notification to the beginning of the array
            notifications.value.unshift(notification);
            unreadCount.value++;
            options.onNewNotification?.(notification);
          }
        }
      }
    };

    // Subscribe to channel
    const result = subscribeToChannel(channelName, customEvents);
    isSubscribed.value = !!result;
    
    return result;
  };

  // Get current user ID
  const getCurrentUserId = () => {
    if (process.client) {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        return null;
      }
    }
    return null;
  };

  // Load notifications
  const loadNotifications = (newNotifications: Notification[]) => {
    notifications.value = [...newNotifications];
    updateUnreadCount();
  };

  // Add notification manually
  const addNotification = (notification: Notification) => {
    const notificationExists = notifications.value.some(n => n.id === notification.id);
    if (!notificationExists) {
      notifications.value.unshift(notification);
      if (!notification.read) {
        unreadCount.value++;
      }
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId: string | number) => {
    const notification = notifications.value.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
      options.onNotificationRead?.(notificationId);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    notifications.value.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
      }
    });
    unreadCount.value = 0;
  };

  // Remove notification
  const removeNotification = (notificationId: string | number) => {
    const index = notifications.value.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = notifications.value[index];
      if (!notification.read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
      notifications.value.splice(index, 1);
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    notifications.value = [];
    unreadCount.value = 0;
  };

  // Update unread count
  const updateUnreadCount = () => {
    unreadCount.value = notifications.value.filter(n => !n.read).length;
  };

  // Get notifications by type
  const getNotificationsByType = (type: Notification['type']) => {
    return notifications.value.filter(n => n.type === type);
  };

  // Get unread notifications
  const getUnreadNotifications = () => {
    return notifications.value.filter(n => !n.read);
  };

  // Cleanup notifications
  const cleanupNotifications = () => {
    unbindFromEvent(eventConfig.newMessage);
    unsubscribeFromChannel();
    isSubscribed.value = false;
    clearNotifications();
  };

  // Reconnect to notifications
  const reconnectToNotifications = async (userId?: string | number) => {
    cleanupNotifications();
    if (userId) {
      await subscribeToUserNotifications(userId);
    } else {
      await subscribeToGeneralNotifications();
    }
  };

  return {
    // State
    pusher: readonly(pusher),
    channel: readonly(channel),
    isConnected: readonly(isConnected),
    connectionState: readonly(connectionState),
    notifications: readonly(notifications),
    unreadCount: readonly(unreadCount),
    isSubscribed: readonly(isSubscribed),
    
    // Actions
    initializePusher,
    subscribeToUserNotifications,
    subscribeToGeneralNotifications,
    loadNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    cleanupNotifications,
    reconnectToNotifications,
    disconnectPusher,
    testConnection,
    
    // Utilities
    generateUserChannelName,
    generateGeneralChannelName,
    getCurrentUserId,
    getNotificationsByType,
    getUnreadNotifications,
    updateUnreadCount,
  };
} 