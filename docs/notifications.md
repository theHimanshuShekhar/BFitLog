# Notifications

BFitLog stores reminder preferences per user and notification permission/device metadata per device.

## Android

Android local notification scheduling is planned around the stored reminder settings and device permission row. The current app records whether notifications are enabled for a device; native scheduling should be verified in an Expo development build before relying on it for production reminders.

## Web

Web notifications depend on browser permission, service-worker/PWA install behavior, and HTTPS origin support. Treat web reminders as best-effort and fall back to visible in-app reminder settings/status when browser notification permission is unavailable.

## Rest timer

The rest timer is deliberately app-local state. It is not written to workout stats; only completed exercise/set data is persisted.
