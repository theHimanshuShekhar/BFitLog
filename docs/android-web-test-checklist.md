# Android/Web Quality Checklist

Use this checklist for release verification.

## Android

- Run in Expo Go or a development build.
- Verify Better Auth session persistence via SecureStore after app restart.
- Log body weight while offline, reconnect, and confirm sync.
- Verify notification permission prompts before enabling reminders.
- Verify rest timer reminder behavior in a development build before relying on notifications.
- Verify exercise media opens with embedded web fallback or external browser fallback.

## Web/PWA

- Export web build with `pnpm --filter @bfitlog/mobile exec expo export --platform web --output-dir dist-test`.
- Serve behind HTTPS for production auth cookies.
- Verify PWA metadata/icons in the exported manifest output.
- Verify installability in Chrome/Edge.
- Verify body-weight local storage behavior offline and after reload.
- Verify responsive desktop layout at narrow, tablet, and desktop widths.

Current automated verification covers tests, TypeScript, and Expo web export. Device-only notification and SecureStore checks require a physical/emulated Android environment.
