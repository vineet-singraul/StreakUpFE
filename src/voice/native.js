// Bridge to the Android app's native FindPhoneAlarm plugin (android/.../FindPhoneAlarmPlugin.java).
// In the normal browser/PWA these calls do nothing and the web siren is used instead.
import { Capacitor, registerPlugin } from '@capacitor/core';

export const isNativeApp = Capacitor.isNativePlatform();
const Plugin = registerPlugin('FindPhoneAlarm');

const safe = (fn) => (isNativeApp ? fn().catch(() => null) : Promise.resolve(null));

export const nativeAlarm = {
  /** Volume -> MAX + alarm tone on the ALARM channel (rings in silent mode). Resolves { playing, volumeMaxed } */
  start: () => safe(() => Plugin.start()),
  /** Stops the tone and puts the user's volume back */
  stop: () => safe(() => Plugin.stop()),
  keepAwake: (on) => safe(() => Plugin.keepAwake({ on })),
};
