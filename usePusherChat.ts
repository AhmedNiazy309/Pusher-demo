import type { PusherCoreOptions } from './usePusherCore';
import { usePusherCore } from './usePusherCore';
import { usePusherConfig } from './usePusherConfig';

export interface ChatMessage {
  id: string | number;
  body: string;
  type: 'text' | 'attachment';
  sender: { id: number | string };
  created_at: string;
  is_temp?: boolean;
  attachments?: Array<{
    file_name: string;
    type: string;
    url: string;
  }>;
}

export interface ChatOptions extends PusherCoreOptions {
  channelPrefix?: string;
  channelSeparator?: string;
  newMessageEvent?: string;
  onNewMessage?: (message: ChatMessage) => void;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageError?: (error: any) => void;
}

export function usePusherChat(options: ChatOptions) {
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
    newMessage: options.newMessageEvent || defaultEventConfig.newMessage,
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

  // Chat-specific state
  const currentRoomId = ref<string | number | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const isSubscribed = ref(false);

  // Generate channel name
  const generateChannelName = (roomId: string | number) => {
    return `${channelConfig.prefix}${channelConfig.separator}chat${channelConfig.separator}conversation${channelConfig.separator}${roomId}`;
  };

  // Subscribe to chat room
  const subscribeToChat = async (roomId: string | number) => {
    if (!roomId) return;

    currentRoomId.value = roomId;
    const channelName = generateChannelName(roomId);

    // Custom events for chat
    const customEvents = {
      [eventConfig.newMessage]: (data: any) => {
        if (data.message) {
          const message = data.message as ChatMessage;
          
          // Remove any temporary messages (messages sent by current user)
          const currentUserId = getCurrentUserId();
          const tempMessageIndex = messages.value.findIndex(msg => 
            msg.is_temp && msg.sender?.id === currentUserId
          );
          
          if (tempMessageIndex !== -1) {
            messages.value.splice(tempMessageIndex, 1);
          }
          
          // Check if message already exists to avoid duplicates
          const messageExists = messages.value.some(msg => msg.id === message.id);
          if (!messageExists) {
            // Add new message to the end of the array
            messages.value.push(message);
            options.onNewMessage?.(message);
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

  // Create temporary message for optimistic updates
  const createTempMessage = (body: string, type: 'text' | 'attachment' = 'text', file?: File): ChatMessage => {
    const currentUserId = getCurrentUserId();
    
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      body,
      type,
      sender: { id: currentUserId },
      created_at: new Date().toISOString(),
      is_temp: true,
    };

    if (type === 'attachment' && file) {
      tempMessage.attachments = [{
        file_name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 
              file.type.startsWith('audio/') ? 'audio' : 
              file.type === 'application/pdf' ? 'pdf' : 'document',
        url: URL.createObjectURL(file),
      }];
    }

    return tempMessage;
  };

  // Add temporary message
  const addTempMessage = (message: ChatMessage) => {
    messages.value.push(message);
    options.onMessageSent?.(message);
  };

  // Remove temporary message
  const removeTempMessage = (tempId: string) => {
    const tempIndex = messages.value.findIndex(msg => msg.id === tempId);
    if (tempIndex !== -1) {
      messages.value.splice(tempIndex, 1);
    }
  };

  // Send message (optimistic update)
  const sendMessage = async (
    roomId: string | number, 
    messageText: string, 
    sendFunction: (roomId: string | number, message: string) => Promise<any>
  ) => {
    if (!roomId || !messageText.trim()) {
      throw new Error("بيانات الرسالة غير صحيحة");
    }

    // Create temporary message
    const tempMessage = createTempMessage(messageText.trim());
    
    // Add temporary message immediately for instant feedback
    addTempMessage(tempMessage);

    try {
      // Send message via API
      const result = await sendFunction(roomId, messageText.trim());
      
      // The real message will be added via Pusher event
      // No need to manually add it here
      
      return result;
    } catch (error: any) {
      // Remove temporary message if sending failed
      removeTempMessage(tempMessage.id);
      options.onMessageError?.(error);
      throw error;
    }
  };

  // Send file message (optimistic update)
  const sendFileMessage = async (
    roomId: string | number, 
    file: File, 
    sendFunction: (roomId: string | number, file: File) => Promise<any>
  ) => {
    if (!roomId || !file) {
      throw new Error("بيانات الملف غير صحيحة");
    }

    // Check file size (2MB limit)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
    }

    // Create temporary message
    const tempMessage = createTempMessage(file.name, 'attachment', file);
    
    // Add temporary message immediately for instant feedback
    addTempMessage(tempMessage);

    try {
      // Send file via API
      const result = await sendFunction(roomId, file);
      
      // The real message will be added via Pusher event
      // No need to manually add it here
      
      return result;
    } catch (error: any) {
      // Remove temporary message if sending failed
      removeTempMessage(tempMessage.id);
      options.onMessageError?.(error);
      throw error;
    }
  };

  // Load messages
  const loadMessages = (newMessages: ChatMessage[]) => {
    messages.value = [...newMessages];
  };

  // Add message manually (for initial load)
  const addMessage = (message: ChatMessage) => {
    const messageExists = messages.value.some(msg => msg.id === message.id);
    if (!messageExists) {
      messages.value.push(message);
    }
  };

  // Clear messages
  const clearMessages = () => {
    messages.value = [];
  };

  // Cleanup chat
  const cleanupChat = () => {
    unbindFromEvent(eventConfig.newMessage);
    unsubscribeFromChannel();
    currentRoomId.value = null;
    isSubscribed.value = false;
    clearMessages();
  };

  // Reconnect to chat
  const reconnectToChat = async () => {
    if (currentRoomId.value) {
      cleanupChat();
      await subscribeToChat(currentRoomId.value);
    }
  };

  return {
    // State
    pusher: readonly(pusher),
    channel: readonly(channel),
    isConnected: readonly(isConnected),
    connectionState: readonly(connectionState),
    currentRoomId: readonly(currentRoomId),
    messages: readonly(messages),
    isSubscribed: readonly(isSubscribed),
    
    // Actions
    initializePusher,
    subscribeToChat,
    sendMessage,
    sendFileMessage,
    loadMessages,
    addMessage,
    clearMessages,
    cleanupChat,
    reconnectToChat,
    disconnectPusher,
    testConnection,
    
    // Utilities
    generateChannelName,
    createTempMessage,
    addTempMessage,
    removeTempMessage,
    getCurrentUserId,
  };
} 