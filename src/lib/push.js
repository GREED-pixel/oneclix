// src/lib/push.js
// Web Push subscription helpers
// ─────────────────────────────────────────────────────────────
// Generate your VAPID keys once at:  https://vapidkeys.com
// Then put the PUBLIC key in your .env:
//   REACT_APP_VAPID_PUBLIC_KEY=...
// And the PRIVATE key in your Supabase Edge Function environment.
// ─────────────────────────────────────────────────────────────
import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

/**
 * Register the service worker and subscribe this device to push notifications.
 * Saves the subscription to Supabase so the backend can send pushes.
 */
export async function subscribeToPush(businessId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push not supported in this browser.");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("Please allow notifications so you get alerted when orders come in!");
      return false;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON();
    await supabase.from("push_subscriptions").upsert(
      { business_id: businessId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "endpoint" }
    );
    return true;
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

/**
 * Check if this device is already subscribed.
 */
export async function isSubscribed() {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/**
 * Register the service worker (call once on app load).
 */
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  }
}
