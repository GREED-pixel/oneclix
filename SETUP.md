# OrderAhead — Setup Guide

A full-stack order-ahead app for any small business.
Customers order via a web link; the owner gets push notifications on their phone.

---

## 📁 File Structure

```
orderahead/
├── public/
│   ├── manifest.json          ← PWA config (makes it installable)
│   └── service-worker.js      ← Handles push notifications
├── src/
│   ├── App.jsx                ← Router + global styles
│   ├── lib/
│   │   ├── supabase.js        ← Supabase client
│   │   └── push.js            ← Push notification helpers
│   └── pages/
│       ├── WelcomePage.jsx    ← Public landing page (/)
│       ├── MenuPage.jsx       ← Customer ordering page (/order/:slug)
│       ├── LoginPage.jsx      ← Owner login (/login)
│       ├── DashboardPage.jsx  ← Owner order management (/dashboard)
│       └── AdminPage.jsx      ← Owner product/business setup (/admin)
├── supabase_schema.sql        ← Run this in Supabase first
└── package.json
```

---

## 🚀 Step 1 — Set Up Supabase

1. Go to **https://supabase.com** and create a free account
2. Create a **New Project** (choose any region close to you)
3. Wait for it to provision (~1 min)
4. Go to **SQL Editor** and paste + run the entire `supabase_schema.sql` file
5. Go to **Storage** → verify the `product-images` bucket was created and is set to **Public**
6. Go to **Project Settings → API** and copy:
   - **Project URL** → goes in `REACT_APP_SUPABASE_URL`
   - **anon public key** → goes in `REACT_APP_SUPABASE_ANON_KEY`

---

## 🔔 Step 2 — Generate VAPID Keys (for Push Notifications)

VAPID keys allow your server to send push notifications to browsers.

1. Go to **https://vapidkeys.com** (or run `npx web-push generate-vapid-keys`)
2. You'll get a **public key** and a **private key**
3. Save both — you'll need them next

---

## ⚙️ Step 3 — Create Your .env File

In the root of the project, create a file called `.env`:

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_VAPID_PUBLIC_KEY=your-vapid-public-key-here
```

---

## 📦 Step 4 — Install & Run

```bash
npm install
npm start
```

Your app will be running at **http://localhost:3000**

---

## 🌐 Step 5 — Deploy (so customers can access it)

### Option A: Vercel (Recommended — free)
```bash
npm install -g vercel
vercel
```
Add your `.env` variables in the Vercel dashboard under **Project Settings → Environment Variables**.

### Option B: Netlify
```bash
npm run build
# Drag the /build folder to netlify.com/drop
```
Add env variables under **Site Settings → Environment Variables**.

---

## 📱 Step 6 — Push Notifications (Server Side)

To actually **send** push notifications when an order comes in, you need a small server-side function.

### Using Supabase Edge Functions (Recommended)

1. Install Supabase CLI: `npm install -g supabase`
2. Create a function: `supabase functions new notify-owner`
3. Paste this into the function:

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import webPush from "npm:web-push"

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_EMAIL   = "mailto:you@youremail.com"

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

serve(async (req) => {
  const { businessId, orderData } = await req.json()

  // Fetch all push subscriptions for this business
  const { createClient } = await import("npm:@supabase/supabase-js")
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("business_id", businessId)

  const payload = JSON.stringify({
    title: "New Order! 🛒",
    body: `${orderData.customer_name} just placed an order — $${orderData.total}`,
    url: "/dashboard"
  })

  await Promise.all((subs || []).map(sub =>
    webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    ).catch(console.error)
  ))

  return new Response("ok")
})
```

4. Deploy: `supabase functions deploy notify-owner`
5. Set secrets:
```bash
supabase secrets set VAPID_PUBLIC_KEY=your-public-key
supabase secrets set VAPID_PRIVATE_KEY=your-private-key
```

6. Then in `MenuPage.jsx`, after a successful order insert, call:
```js
await fetch("https://YOUR_PROJECT.supabase.co/functions/v1/notify-owner", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
  body: JSON.stringify({ businessId: business.id, orderData: order })
})
```

---

## 📲 Step 7 — Install as an App (iOS & Android)

### For the Owner (install the dashboard as a phone app):
**iPhone:**
1. Open the site in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Name it "OrderAhead" and tap Add

**Android:**
1. Open the site in Chrome
2. Tap the 3-dot menu
3. Tap "Add to Home Screen" or "Install App"

The app icon will appear on your home screen and open full-screen, just like a native app!

---

## 🔗 How It All Works

```
Customer visits:     yoursite.com/order/your-shop-slug
                          ↓
           Browses menu, adds items, enters name
                          ↓
                 Taps "Place order"
                          ↓
        Order saved to Supabase database
                          ↓
      Edge function sends Web Push notification
                          ↓
    Owner's phone pings → dashboard updates live
                          ↓
     Owner taps: Pending → Preparing → Ready → Done
                          ↓
            Customer picks up their order 🎉
```

---

## 👤 Owner First-Time Flow

1. Go to `/login` → Create an account
2. Go to `/admin` → Enter business name, description, and pick a URL slug
3. Add your products with photos and prices
4. Share your customer link: `yoursite.com/order/your-slug`
5. Enable push notifications on your phone from the dashboard
6. Start receiving orders!
