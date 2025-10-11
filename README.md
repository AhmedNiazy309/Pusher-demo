# Pusher Composables - قابلة لإعادة الاستخدام

هذه المجموعة من Composables تتيح لك استخدام Pusher بسهولة في أي مشروع Nuxt.js مع تغيير البيانات فقط.

## 📁 الملفات

### 1. `usePusherConfig.ts`
ملف التكوين الأساسي لـ Pusher - يحتوي على الإعدادات الافتراضية.

### 2. `usePusherCore.ts`
Composable أساسي لـ Pusher - يوفر الوظائف الأساسية للاتصال والاشتراك.

### 3. `usePusherChat.ts`
Composable خاص بالمحادثات - يوفر وظائف المحادثات الفورية.

### 4. `usePusherNotifications.ts`
Composable خاص بالإشعارات - يوفر وظائف الإشعارات الفورية.

### 5. `usePusherExample.ts`
مثال على كيفية استخدام جميع Composables معاً.

## 🚀 كيفية الاستخدام

### الخطوة 1: تثبيت Pusher
```bash
npm install pusher-js
```

### الخطوة 2: نسخ الملفات
انسخ جميع الملفات من مجلد `composables` إلى مشروعك.

### الخطوة 3: تعديل التكوين
في ملف `usePusherExample.ts` أو في ملف التكوين الخاص بك:

```typescript
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
```

### الخطوة 4: الاستخدام في المكون

```vue
<template>
  <div>
    <!-- حالة الاتصال -->
    <div class="connection-status">
      <span :class="chatConnected ? 'connected' : 'disconnected'">
        {{ chatConnected ? 'متصل' : 'غير متصل' }}
      </span>
    </div>

    <!-- الرسائل -->
    <div class="messages">
      <div v-for="message in chatMessages" :key="message.id" class="message">
        {{ message.body }}
      </div>
    </div>

    <!-- إرسال رسالة -->
    <div class="send-message">
      <input v-model="newMessage" placeholder="اكتب رسالة..." />
      <button @click="sendMessage">إرسال</button>
    </div>

    <!-- الإشعارات -->
    <div class="notifications">
      <div v-for="notification in notifications" :key="notification.id" class="notification">
        {{ notification.message }}
      </div>
      <span class="unread-count">{{ unreadCount }}</span>
    </div>
  </div>
</template>

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

const newMessage = ref('');

// تهيئة المحادثة والإشعارات
onMounted(async () => {
  const userId = JSON.parse(localStorage.getItem('user') || 'null');
  
  // تهيئة الإشعارات
  await initializeNotifications(userId);
  
  // تهيئة المحادثة إذا كان هناك roomId
  const route = useRoute();
  if (route.params.id) {
    await initializeChat(route.params.id);
  }
});

// إرسال رسالة
const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  
  const route = useRoute();
  if (route.params.id) {
    try {
      await sendChatMessage(route.params.id, newMessage.value, async (roomId, message) => {
        // استدعاء API لإرسال الرسالة
        const { data } = await useFetchApi(`chats/${roomId}/send-message`, {
          method: 'POST',
          body: { message }
        });
        return data.value;
      });
      
      newMessage.value = ''; // مسح الرسالة
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    }
  }
};

// تنظيف عند إغلاق المكون
onUnmounted(() => {
  cleanupAll();
});
</script>
```

## 🔧 التخصيص

### تغيير أسماء القنوات
```typescript
const chatPusher = usePusherChat({
  config: pusherConfig,
  channelPrefix: 'private', // يمكن تغييرها
  channelSeparator: '-', // يمكن تغييرها
  newMessageEvent: 'new-message', // يمكن تغييرها
  // ...
});
```

### تغيير وظائف المصادقة
```typescript
const chatPusher = usePusherChat({
  config: pusherConfig,
  getAuthToken: () => {
    // منطق مخصص للحصول على token
    return localStorage.getItem('custom_token') || '';
  },
  // ...
});
```

### إضافة معالجات الأحداث
```typescript
const chatPusher = usePusherChat({
  config: pusherConfig,
  onNewMessage: (message) => {
    // منطق مخصص عند استلام رسالة جديدة
    console.log('رسالة جديدة:', message);
    // يمكن إضافة صوت أو إشعار هنا
  },
  onMessageError: (error) => {
    // منطق مخصص عند حدوث خطأ
    console.error('خطأ في الرسالة:', error);
  },
  // ...
});
```

## 📋 الميزات

### المحادثات
- ✅ رسائل فورية
- ✅ رسائل مؤقتة (Optimistic Updates)
- ✅ إرسال ملفات
- ✅ إدارة الأخطاء
- ✅ إعادة الاتصال التلقائي
- ✅ تنظيف الموارد

### الإشعارات
- ✅ إشعارات فورية
- ✅ عداد الإشعارات غير المقروءة
- ✅ تمييز الإشعارات كمقروءة
- ✅ تصفية الإشعارات حسب النوع
- ✅ إدارة الإشعارات

### عام
- ✅ إدارة الاتصال
- ✅ معالجة الأخطاء
- ✅ تنظيف الذاكرة
- ✅ قابلية التخصيص
- ✅ TypeScript support

## 🛠️ المتطلبات

- Nuxt.js 3.x
- Vue 3.x
- pusher-js

## 📝 ملاحظات

1. تأكد من إعداد نقطة المصادقة في الخادم الخاص بك
2. تأكد من تكوين Pusher في الخادم بشكل صحيح
3. استخدم القنوات الخاصة للأمان
4. قم بتنظيف الموارد عند إغلاق المكونات

## 🤝 المساهمة

يمكنك تخصيص هذه Composables حسب احتياجات مشروعك وإضافة ميزات جديدة. 