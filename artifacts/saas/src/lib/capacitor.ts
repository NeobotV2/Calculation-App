import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === "ios";
export const isAndroid = Capacitor.getPlatform() === "android";
export const isWeb = Capacitor.getPlatform() === "web";

export const APP_SCHEME = "cleancalcpro";

export function getRedirectUrl(path = ""): string {
  if (isNative) {
    return `${APP_SCHEME}://${path}`;
  }
  return `${window.location.origin}${import.meta.env.BASE_URL}${path}`;
}
