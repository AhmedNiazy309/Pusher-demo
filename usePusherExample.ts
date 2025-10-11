import { usePusherChat } from './usePusherChat';
import { usePusherNotifications } from './usePusherNotifications';
import type { PusherConfig } from './usePusherConfig';

// مثال على كيفية استخدام Pusher في مشروع جديد
export const usePusherExample = () => {
  
  // ===== تكوين Pusher للمشروع =====
  const pusherConfig: PusherConfig = {
    appKey: 'YOUR_PUSHER_APP_KEY', // غير هذا بمفتاح Pusher الخاص بك
    cluster: 'eu', // غير هذا بالـ cluster الخاص بك
    authEndpoint: 'https://your-domain.com/api/broadcasting/auth', // غير هذا بنقطة المصادقة الخاصة بك
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

  // ===== استخدام Pusher للمحادثات =====
  const chatPusher = usePusherChat({
    config: pusherConfig,
    channelPrefix: 'private', // يمكن تغييرها حسب المشروع
    channelSeparator: '-', // يمكن تغييرها حسب المشروع
    newMessageEvent: 'new-message', // يمكن تغييرها حسب المشروع
    onNewMessage: (message) => {
      console.log('رسالة جديدة:', message);
      // يمكن إضافة منطق إضافي هنا مثل تشغيل صوت أو إظهار إشعار
    },
    onMessageSent: (message) => {
      console.log('تم إرسال الرسالة:', message);
    },
    onMessageError: (error) => {
      console.error('خطأ في إرسال الرسالة:', error);
    },
    onConnected: () => {
      console.log('✅ تم الاتصال بـ Pusher للمحادثات');
    },
    onDisconnected: () => {
      console.log('❌ تم قطع الاتصال بـ Pusher للمحادثات');
    },
    onError: (error) => {
      console.error('🚨 خطأ في اتصال Pusher للمحادثات:', error);
    }
  });

  // ===== استخدام Pusher للإشعارات =====
  const notificationPusher = usePusherNotifications({
    config: pusherConfig,
    channelPrefix: 'private', // يمكن تغييرها حسب المشروع
    channelSeparator: '-', // يمكن تغييرها حسب المشروع
    notificationEvent: 'new-notification', // يمكن تغييرها حسب المشروع
    onNewNotification: (notification) => {
      console.log('إشعار جديد:', notification);
      // يمكن إضافة منطق إضافي هنا مثل إظهار toast أو تشغيل صوت
    },
    onNotificationRead: (notificationId) => {
      console.log('تم قراءة الإشعار:', notificationId);
    },
    onNotificationError: (error) => {
      console.error('خطأ في الإشعارات:', error);
    },
    onConnected: () => {
      console.log('✅ تم الاتصال بـ Pusher للإشعارات');
    },
    onDisconnected: () => {
      console.log('❌ تم قطع الاتصال بـ Pusher للإشعارات');
    },
    onError: (error) => {
      console.error('🚨 خطأ في اتصال Pusher للإشعارات:', error);
    }
  });

  // ===== وظائف مساعدة للمحادثات =====
  const initializeChat = async (roomId: string | number) => {
    try {
      // تهيئة Pusher
      chatPusher.initializePusher();
      
      // انتظار قليل للاتصال
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // الاشتراك في قناة المحادثة
      await chatPusher.subscribeToChat(roomId);
      
      console.log('تم تهيئة المحادثة بنجاح');
    } catch (error) {
      console.error('خطأ في تهيئة المحادثة:', error);
    }
  };

  const sendChatMessage = async (
    roomId: string | number, 
    messageText: string, 
    sendApiFunction: (roomId: string | number, message: string) => Promise<any>
  ) => {
    try {
      await chatPusher.sendMessage(roomId, messageText, sendApiFunction);
      console.log('تم إرسال الرسالة بنجاح');
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      throw error;
    }
  };

  const sendChatFile = async (
    roomId: string | number, 
    file: File, 
    sendApiFunction: (roomId: string | number, file: File) => Promise<any>
  ) => {
    try {
      await chatPusher.sendFileMessage(roomId, file, sendApiFunction);
      console.log('تم إرسال الملف بنجاح');
    } catch (error) {
      console.error('خطأ في إرسال الملف:', error);
      throw error;
    }
  };

  // ===== وظائف مساعدة للإشعارات =====
  const initializeNotifications = async (userId?: string | number) => {
    try {
      // تهيئة Pusher
      notificationPusher.initializePusher();
      
      // انتظار قليل للاتصال
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // الاشتراك في الإشعارات
      if (userId) {
        await notificationPusher.subscribeToUserNotifications(userId);
      } else {
        await notificationPusher.subscribeToGeneralNotifications();
      }
      
      console.log('تم تهيئة الإشعارات بنجاح');
    } catch (error) {
      console.error('خطأ في تهيئة الإشعارات:', error);
    }
  };

  const markNotificationAsRead = (notificationId: string | number) => {
    notificationPusher.markAsRead(notificationId);
  };

  const markAllNotificationsAsRead = () => {
    notificationPusher.markAllAsRead();
  };

  // ===== وظائف التنظيف =====
  const cleanupAll = () => {
    chatPusher.cleanupChat();
    notificationPusher.cleanupNotifications();
  };

  const disconnectAll = () => {
    chatPusher.disconnectPusher();
    notificationPusher.disconnectPusher();
  };

  return {
    // ===== حالة المحادثات =====
    chatMessages: chatPusher.messages,
    chatConnected: chatPusher.isConnected,
    chatConnectionState: chatPusher.connectionState,
    chatCurrentRoom: chatPusher.currentRoomId,
    chatSubscribed: chatPusher.isSubscribed,

    // ===== حالة الإشعارات =====
    notifications: notificationPusher.notifications,
    unreadCount: notificationPusher.unreadCount,
    notificationConnected: notificationPusher.isConnected,
    notificationConnectionState: notificationPusher.connectionState,
    notificationSubscribed: notificationPusher.isSubscribed,

    // ===== وظائف المحادثات =====
    initializeChat,
    sendChatMessage,
    sendChatFile,
    loadChatMessages: chatPusher.loadMessages,
    clearChatMessages: chatPusher.clearMessages,
    reconnectChat: chatPusher.reconnectToChat,

    // ===== وظائف الإشعارات =====
    initializeNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    loadNotifications: notificationPusher.loadNotifications,
    clearNotifications: notificationPusher.clearNotifications,
    reconnectNotifications: notificationPusher.reconnectToNotifications,

    // ===== وظائف التنظيف =====
    cleanupAll,
    disconnectAll,

    // ===== وظائف مساعدة =====
    getUnreadNotifications: notificationPusher.getUnreadNotifications,
    getNotificationsByType: notificationPusher.getNotificationsByType,
  };
};

// ===== مثال على الاستخدام في المكون =====
/*
<script setup>
import { usePusherExample } from '@/composables/usePusherExample';

const {
  chatMessages,
  chatConnected,
  notifications,
  unreadCount,
  initializeChat,
  sendChatMessage,
  initializeNotifications,
  markNotificationAsRead,
  cleanupAll
} = usePusherExample();

// تهيئة المحادثة
onMounted(async () => {
  const userId = JSON.parse(localStorage.getItem('user') || 'null');
  
  // تهيئة الإشعارات
  await initializeNotifications(userId);
  
  // إذا كان هناك roomId في الـ route
  const route = useRoute();
  if (route.params.id) {
    await initializeChat(route.params.id);
  }
});

// إرسال رسالة
const sendMessage = async (messageText: string) => {
  const route = useRoute();
  if (route.params.id) {
    await sendChatMessage(route.params.id, messageText, async (roomId, message) => {
      // استدعاء API لإرسال الرسالة
      const { data } = await useFetchApi(`chats/${roomId}/send-message`, {
        method: 'POST',
        body: { message }
      });
      return data.value;
    });
  }
};

// تنظيف عند إغلاق المكون
onUnmounted(() => {
  cleanupAll();
});
</script>
*/ 