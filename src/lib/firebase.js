// Firebase service layer for the YoteMarket web platform.
// Centralises app init + typed accessors for auth, Firestore, Functions (europe-west1),
// Storage and Analytics. Everything degrades gracefully when env config is absent so the
// UI still runs against bundled demo data during local/preview builds.
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Same Firebase project (`yotemarket-app`) as the mobile + rider Flutter apps, using
// the project's registered Web app config. Firebase web config is not a secret (it ships
// in every client bundle — exactly like the committed firebase_options.dart), so these
// are baked in as defaults; VITE_FIREBASE_* env vars still override for other environments.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDXt0Rpw_Cll8RQ_BO0riSKb8q7oZWvgYY',
  // Google/OAuth sign-in shows this host ("continue to …"). To brand it, point it at
  // auth.yotemarket.co.ke — but ONLY after that subdomain is live on Firebase Hosting
  // (it serves /__/auth/handler). Set VITE_FIREBASE_AUTH_DOMAIN=auth.yotemarket.co.ke in
  // Vercel then redeploy; leaving the fallback keeps sign-in working until it's verified.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'yotemarket-app.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://yotemarket-app-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yotemarket-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'yotemarket-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '494092523203',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:494092523203:web:6543ab44b7b1afceb77476',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-71V2WD4QSF',
};

// Backend region for callable Cloud Functions (matches firebase/functions/index.js).
const FUNCTIONS_REGION = 'europe-west1';

// `firebaseEnabled` lets the whole app know whether a real backend is wired. When false,
// hooks fall back to demo data and auth runs in a local "guest" mode.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let db = null;
let functions = null;
let storage = null;

if (firebaseEnabled) {
  try {
    app = initializeApp(firebaseConfig);
    // App Check — MONITOR mode. The reCAPTCHA v3 site key is PUBLIC (it ships in the page
    // by design), so a default is baked in and VITE_FIREBASE_APPCHECK_SITE_KEY (Vercel /
    // .env.local) overrides it for rotation — same convention as the public Firebase
    // apiKey. This only ATTACHES an attestation token to backend requests; whether the
    // token is REQUIRED is a separate server-side switch (console enforcement +
    // enforceAppCheck on callables), which is still OFF — so nothing is blocked yet and
    // the client can't lock itself out. Enforce only after console metrics show real
    // traffic producing valid tokens.
    const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '6LdRWW8tAAAAALQ8vTc8UMxkBTzuR4I_BMs-FdUm';
    if (appCheckKey) {
      try {
        // Local dev has no reCAPTCHA-verified domain; a debug token (logged to the
        // console, then added to the console's App Check debug list) lets dev through.
        if (import.meta.env.DEV) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(appCheckKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (e) {
        console.warn('[firebase] App Check init skipped:', e?.message || e);
      }
    }
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, FUNCTIONS_REGION);
    storage = getStorage(app);
    // Keep users signed in across reloads/tabs.
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } catch (err) {
    // Misconfiguration shouldn't take the marketing site down.
    console.warn('[firebase] init failed — running in demo mode.', err);
    app = auth = db = functions = storage = null;
  }
}

export const googleProvider = firebaseEnabled ? new GoogleAuthProvider() : null;
if (googleProvider) {
  // Always show the account chooser so a signed-out user can pick / add an account
  // (prevents silently reusing the wrong Google session) and so "sign in or up" is
  // one seamless action for new and returning users alike.
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export { app, auth, db, functions, storage };

// Google OAuth *web* client id — the dedicated web client whose "Authorized JavaScript
// origins" list the production domains (yotemarket.com / yotemarket.co.ke), which is what
// Google One Tap (GIS) requires to render. Only the client *id* is used here; the client
// *secret* is a server-only credential and must never ship in the bundle. The id is public
// (it ships in every client bundle) so it's baked in as a default; VITE_GOOGLE_OAUTH_CLIENT_ID
// overrides. Empty → One Tap silently disables and the normal sign-in buttons still work.
export const GOOGLE_OAUTH_CLIENT_ID = firebaseEnabled
  ? (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
     '494092523203-5lpuoneecgi0qbm4s9fpfr1v2g51dn0n.apps.googleusercontent.com')
  : '';

// Web Push (FCM) — VAPID *public* key from Firebase console → Cloud Messaging →
// Web Push certificates. Like the rest of the web config it's not a secret (it
// ships in the client bundle), so it's baked in as a default; VITE_FIREBASE_VAPID_KEY
// still overrides for other environments. Empty → push no-ops (in-app chat unaffected).
export const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BLo4iaFPDAG243CWvQPAZ2gBRi86_9e65QnILeieNvVZISX7Ol0wm-hJ0k0OB7K83xSJvPW8u_A1bpIa8Mg1TM4';

// Lazily resolve a Messaging instance, or null when the browser/SW can't support
// it. Cached after the first call.
let _messaging;
export async function getMessagingInstance() {
  if (!app) return null;
  if (_messaging !== undefined) return _messaging;
  try {
    const { isSupported, getMessaging } = await import('firebase/messaging');
    _messaging = (await isSupported()) ? getMessaging(app) : null;
  } catch {
    _messaging = null;
  }
  return _messaging;
}

// ── Callable helpers ─────────────────────────────────────────────────────────
// Each returns the function payload directly, or throws a friendly Error.
function callable(name, opts) {
  return async (data) => {
    if (!functions) throw new Error('Backend not configured');
    const fn = httpsCallable(functions, name, opts);
    const res = await fn(data);
    return res.data;
  };
}

// AI calls run multi-round tool-calling against a large model — a full report can take
// a few minutes, well past the 70s httpsCallable default, so give them real headroom.
/** AI chat completion → { reply, model }. messages:[{role,content}], system? */
export const aiChat = callable('aiChat', { timeout: 300000 });
/** Grounded YoteAI assistant → { reply, products }. { role?, messages:[{role,content}] }.
 *  Roles: shopper | search | merchant | support. Reads the caller's real data server-side. */
export const aiAssistant = callable('aiAssistant', { timeout: 300000 });
/** Create an order — SERVER-PRICED. { items:[{pid,qty}] | offer:{convId,offerId},
 *  fulfillment, hubId?, hubName?, payMethod, buyerName?, buyerPhone? }
 *  → { orderId, subtotal, deliveryFee, total, storeId, storeName }.
 *  Clients can't write `orders` directly — the server prices every line. */
export const placeOrder = callable('placeOrder');
export const quoteDelivery = callable('quoteDelivery');
/** One door for every specialist AI task -> see web_app/docs/ai-architecture.md.
 *  { task, input } -> the task's result, stamped with _source/_cached/_model. */
export const aiTask = callable('aiTask', { timeout: 60000 });
/** AI packed-shipping-weight estimate for a product -> { kg, basis, confidence, units }. */
export const estimateProductWeight = callable('estimateProductWeight', { timeout: 60000 });

/** Lipa na M-Pesa STK push → { checkoutRequestId, merchantRequestId }. */
export const mpesaStkPush = callable('mpesaStkPush');
/** Merchant subscription STK push → { checkoutRequestId, merchantRequestId }. */
export const subscribeMerchant = callable('subscribeMerchant');
/** Self-serve merchant signup → { storeId, already }. Creates the store + merchant account. */
export const registerStore = callable('registerStore');
/** Store owner: set store cover/logo from an uploaded URL → { ok }. { field:'img'|'logo', url }. */
export const updateStoreMedia = callable('updateStoreMedia');
/** Store owner: create/update a product (incl. edited image) → { ok, id }. */
export const saveProduct = callable('saveProduct');
/** Store owner/manager: delete a product (removes it from the storefront) → { ok }. { id }. */
export const deleteProduct = callable('deleteProduct');
/** Authoritative rider payout breakdown → { base, multi, distance, total, km }. */
export const computeRiderPayout = callable('computeRiderPayout');
/** Merchant: set payout destination (first time only) → { ok, payout }. { type, phone?|till?|paybill?, account? }. */
export const setMerchantPayout = callable('setMerchantPayout');
/** Merchant: request a change to an existing payout (staff-approved) → { ok, id }. { type, ... }. */
export const requestPayoutChange = callable('requestPayoutChange');
/** Merchant: withdraw available balance to the set payout via M-Pesa → { ok, settlementId, amount }. { amount? }. */
export const requestMerchantWithdrawal = callable('requestMerchantWithdrawal');
/** Staff: pending payout-change requests → { requests }. */
export const staffListPayoutChanges = callable('staffListPayoutChanges');
/** Staff: approve/reject a payout-change request → { ok }. { id, approve }. */
export const staffResolvePayoutChange = callable('staffResolvePayoutChange');
/** Staff: manually finalize a stuck withdrawal → { ok }. { settlementId, paid }. */
export const staffResolveSettlement = callable('staffResolveSettlement');
/** Staff: reconcile stuck withdrawals via Daraja Transaction Status → { ok, scanned, queried, skipped }. */
export const staffReconcilePayouts = callable('staffReconcilePayouts');
// staffCreditTestBalance REMOVED 2026-07-15 — it minted fake withdrawable balance
// into real merchant accounts. Its reversal tool lives in kits/staff/service.js
// (staffRemoveTestCredits). Nothing on the platform may create money.
/** Staff: full account directory → { users, total }. */
export const staffListUsers = callable('staffListUsers');

// ── Customer support (help desk) ──────────────────────────────────────────────
/** Open a support ticket from the Help Center → { id, ref }. Works signed-in or as a guest. */
export const createSupportTicket = callable('createSupportTicket');
/** The signed-in user's own tickets (newest first) → { tickets }. */
export const listMySupportTickets = callable('listMySupportTickets');
/** Staff: list support tickets → { tickets, counts }. { status?, limit? }. */
export const staffListSupportTickets = callable('staffListSupportTickets');
/** Staff: reply to / triage a ticket → { ok }. { id, message?, status?, priority?, assignToMe? }. */
export const staffReplySupportTicket = callable('staffReplySupportTicket');

// ── Returns, refunds & disputes ──────────────────────────────────────────────
/** Buyer: open a return/refund request on a paid order → { id }. { orderId, reason, detail, photos? }. */
export const openDispute = callable('openDispute');
/** Buyer: my return/refund requests → { disputes }. */
export const listMyDisputes = callable('listMyDisputes');
/** Merchant: disputes against my store → { disputes }. */
export const listStoreDisputes = callable('listStoreDisputes');
/** Merchant: add a response note to a dispute → { ok }. { id, note }. */
export const respondDispute = callable('respondDispute');
/** Staff: list disputes → { disputes, counts }. { status? }. */
export const staffListDisputes = callable('staffListDisputes');
/** Staff: resolve a dispute → { ok, refundAmt }. { id, resolution:'refund'|'partial'|'replace'|'decline', refundAmount?, note? }. */
export const staffResolveDispute = callable('staffResolveDispute');

// ── Store broadcasts (Following channel) ─────────────────────────────────────
/** Merchant: post a broadcast to followers → { id, notified }. { kind, text, image?, productId?, offerText?, offerCode? }. */
export const createStorePost = callable('createStorePost');
/** Merchant: my store's posts + follower count → { posts, followers }. */
export const listMyStorePosts = callable('listMyStorePosts');
/** Merchant/staff: delete a post → { ok }. { id }. */
export const deleteStorePost = callable('deleteStorePost');
/** Shopper: the Following feed — recent posts from stores you follow → { posts }. */
export const getFollowingFeed = callable('getFollowingFeed');
/** Shopper: toggle a like on a post → { liked, count }. { postId }. */
export const reactToPost = callable('reactToPost');
/** Shopper: comment on a post → { id }. { postId, text }. */
export const commentOnPost = callable('commentOnPost');
/** List a post's comments + my like state → { comments, liked }. { postId }. */
export const listPostComments = callable('listPostComments');
/** Store owner / comment author / staff: delete a comment → { ok }. { postId, commentId }. */
export const deletePostComment = callable('deletePostComment');
/** Wallet top-up STK push → { checkoutRequestId, merchantRequestId }. { amount, phone, name? }. */
export const topUpWallet = callable('topUpWallet');
/** Confirm/recover any M-Pesa STK payment (order/subscription/wallet) via Daraja status query
 *  → { paid, settledCount, creditedTotal }. { checkoutRequestId? }. */
export const confirmPayment = callable('confirmPayment');
/** Pay an order from the wallet → { ok, balance }. { orderId }. Deducts + marks paid. */
export const payOrderWithWallet = callable('payOrderWithWallet');
/** Place a cash-on-collection order (dispatch for tracking, unpaid) → { ok }. { orderId }. */
export const placeCashOrder = callable('placeCashOrder');
/** Redeem YotePoints for wallet credit → { redeemed, credited, balancePoints }. { points }. */
export const redeemPoints = callable('redeemPoints');
/** Rider claims an open batched run → { ok, orders }. { runId }. */
export const claimRun = callable('claimRun');
/** Confirm a custody handover (leg 1 store→rider, 2 rider→hub, 3 hub→shopper) → { ok, status }. { orderId, leg, code }. */
export const confirmHandover = callable('confirmHandover');
/** Fetch the handover code the caller is entitled to show → { code }. { orderId, leg }. */
export const getHandoverCode = callable('getHandoverCode');
/** Admin: assign/revoke a dedicated hub-store operator → { ok, hubId }. { email, hubId, hubName }. */
export const assignHubOperator = callable('assignHubOperator');
/** Staff: list dedicated hub operators → { operators }. */
export const staffListHubOperators = callable('staffListHubOperators');
/** Hub operator: active orders at the caller's hub → { hubId, orders, incoming, atHub, enRoute }. */
export const hubListOrders = callable('hubListOrders');
/** Store owner: set the store's pickup location for the map → { ok }. { lat, lng, address? }. */
export const updateStoreLocation = callable('updateStoreLocation');
/** Store owner: set delivery rules → { ok, delivery }. { offers?, fee?, freeOver?, autoDispatch?, note? }. */
export const setStoreDelivery = callable('setStoreDelivery');
// ── Store team (owner manages employees who run the store with their own login) ──
/** Owner: add an employee by email → { ok, uid, role, name }. { email, role:'manager'|'cashier' }. */
export const addStoreEmployee = callable('addStoreEmployee');
/** Owner: list the store team → { employees }. */
export const listStoreEmployees = callable('listStoreEmployees');
/** Owner: change an employee's role → { ok }. { uid, role }. */
export const setStoreEmployeeRole = callable('setStoreEmployeeRole');
/** Owner: remove an employee → { ok }. { uid }. */
export const removeStoreEmployee = callable('removeStoreEmployee');
// ── POS device lock (anti-fraud: POS runs only on owner-authorized terminals) ──
/** Any role: is this device authorized for POS? → { authorized, role, label }. { deviceId }. */
export const posDeviceStatus = callable('posDeviceStatus');
/** Owner: authorize this device as a POS terminal → { ok, label }. { deviceId, label }. */
export const registerPosDevice = callable('registerPosDevice');
/** Owner: list authorized POS terminals → { devices }. */
export const listPosDevices = callable('listPosDevices');
/** Owner: revoke a POS terminal → { ok }. { deviceId }. */
export const removePosDevice = callable('removePosDevice');
/** Store owner: decide fulfilment for an order awaiting a decision → { ok }. { orderId, decision:'delivery'|'pickup' }. */
export const setOrderDeliveryDecision = callable('setOrderDeliveryDecision');
/** Store owner: mark a store-pickup order ready for collection → { ok }. { orderId }. */
export const markOrderReady = callable('markOrderReady');
/** Store owner: confirm a store-pickup collection (enter shopper's code) → { ok }. { orderId, code }. */
export const confirmStorePickup = callable('confirmStorePickup');
/** Store owner: set tax profile (KRA PIN + VAT-registered) → { ok }. { kraPin, vatRegistered }. */
export const setMerchantTaxInfo = callable('setMerchantTaxInfo');
/** Store owner: record an in-store POS sale → { saleId, invoiceNo?, checkoutRequestId?, status }. { items:[{pid,qty}], payMethod, phone?, customerName? }. */
export const posSale = callable('posSale');
/** Admin: grant N free months to every merchant → { granted, months }. { months?, campaignId? }. */
export const grantFreeMonths = callable('grantFreeMonths');
/** Admin: grant N free months to ONE merchant on a chosen package → { ok, uid, plan, months }.
 *  { email, months, kind:'delivery'|'software', subTier?, plan }. */
export const grantMerchantFreeMonths = callable('grantMerchantFreeMonths');
/** Staff: backfill digital receipts for all past paid transactions → { orders, pos, topups, subs }. */
export const backfillReceipts = callable('backfillReceipts');
/** Staff: patch store logos into existing chats + followed-store records → { conversations, follows }. */
export const backfillStoreLogos = callable('backfillStoreLogos');
/** Staff: award YotePoints for past delivered orders → { orders, points }. */
export const backfillPoints = callable('backfillPoints');
/** Staff: backfill order numbers + customer names onto existing orders → { numbered, named }. */
export const backfillOrders = callable('backfillOrders');
/** Admin: create a coupon → { id, code }. { code, type, value, name?, maxRedemptions?, expiresAt? }. */
export const createPromo = callable('createPromo');
/** Staff: list promotions/coupons → { promos }. */
export const listPromos = callable('listPromos');
/** Admin: toggle/delete a promo → { ok }. { id, active } | { id, remove:true }. */
export const setPromoActive = callable('setPromoActive');
/** Merchant: redeem a coupon code → { type, months?|value? }. { code }. */
export const redeemCoupon = callable('redeemCoupon');
/** Shopper: submit/update a product review (verified purchase + email required) → { ok, rating, reviews }. { productId, rating, text? }. */
export const submitReview = callable('submitReview');
/** Shopper: flag a fraudulent/abusive review for staff → { ok }. { reviewId, reason? }. */
export const reportReview = callable('reportReview');
// ── YoteFeed (shortform video selling) ───────────────────────────────────────
/** Merchant: publish a shortform video post → { ok, id }. { videoUrl, caption?, productId?, posterUrl?, durationMs?, aspect? }. */
export const createFeedPost = callable('createFeedPost');
/** Merchant: edit one of your clips (caption/product, optional new video) → { ok }. { postId, caption?, productId?, videoUrl?, ... }. */
export const editFeedPost = callable('editFeedPost');
/** Shopper: like/unlike a feed post → { ok, likes, liked }. { postId, like }. */
export const likeFeedPost = callable('likeFeedPost');
/** Shopper: flag a feed post for staff → { ok }. { postId, reason? }. */
export const reportFeedPost = callable('reportFeedPost');
/** Owner or staff: remove a feed post → { ok }. { postId }. */
export const deleteFeedPost = callable('deleteFeedPost');
/** Batched feed engagement (ranking signals) → { ok }. { events:[{postId,views?,finishes?,shopTaps?}] }. */
export const recordFeedEvents = callable('recordFeedEvents');
/** Staff: open review-abuse reports for triage → { reports }. */
export const staffListReviewReports = callable('staffListReviewReports');
/** Staff: remove a review + correct rating aggregates → { ok }. { reviewId, reason? }. */
export const staffRemoveReview = callable('staffRemoveReview');
/** Buyer or selling merchant: cancel an order (auto-refunds paid orders to wallet) → { ok, cancelledBy, refunded }. { orderId, reason? }. */
export const cancelOrder = callable('cancelOrder');
/** Buyer: remove a completed/cancelled order from your list (kept for records) → { ok }. { orderId }. */
export const dismissOrder = callable('dismissOrder');
/** Merchant: remove a failed withdrawal from your payouts list → { ok }. { settlementId }. */
export const dismissSettlement = callable('dismissSettlement');
/** Self-serve: permanently close your account (shopper only; merchants file a request) → { ok }. */
export const deleteMyAccount = callable('deleteMyAccount');
/* In-app notifications — reads are direct (rules-scoped to the owner); mutations go
   through callables so `uid` can't be spoofed and only your own can be touched. */
export const markNotificationsRead = callable('markNotificationsRead');
export const deleteNotification = callable('deleteNotification');
/** Store owner: request closure of your store → staff review → { ok, status }. { reason? }. */
export const requestAccountDeletion = callable('requestAccountDeletion');
/** Staff: list store-closure requests → { requests }. */
export const staffListDeletionRequests = callable('staffListDeletionRequests');
/** Staff/admin: approve or reject a store-closure request → { ok, status }. { id, approve, note? }. */
export const staffResolveDeletionRequest = callable('staffResolveDeletionRequest');

// ── Store profile, socials & followers (owner-editable) ─────────────────────
/** Store owner/manager: edit shop name/area/tagline/address/phone → { ok, storeId }. */
export const updateStoreProfile = callable('updateStoreProfile');
/** Store owner/manager: set social links → { ok, socials }. { instagram?, facebook?, tiktok?, x?, youtube?, whatsapp?, website? }. */
export const setStoreSocials = callable('setStoreSocials');
/** Store owner/manager: list the store's followers → { ok, count, followers:[{uid,name,photoUrl,followedAt}] }. */
export const listStoreFollowers = callable('listStoreFollowers');
/** Staff: reconcile every store's follower count from the follow records → { ok, stores, followers }. */
export const backfillFollowerCounts = callable('backfillFollowerCounts');
/** Staff: denormalize planTier onto every store from its owner's subscription (run once after entitlements deploy) → { ok, stores }. */
export const backfillStoreTiers = callable('backfillStoreTiers');
/** Merchant: does the caller bypass entitlements (platform staff/admin/owner)? → { staff }. */
export const entitlementContext = callable('entitlementContext');

// ── Careers ──────────────────────────────────────────────────────────────────
/** Public: apply for a job from /careers → { id, ref }. { name, email, phone?, dept, role?, links?, message }. */
export const submitJobApplication = callable('submitJobApplication');
/** Staff: every job application, newest first → { applications, counts }. */
export const staffListJobApplications = callable('staffListJobApplications');
/** Staff: move an application through the hiring funnel → { ok, stage }. { id, stage, note? }. */
export const staffSetJobApplicationStage = callable('staffSetJobApplicationStage');
/** Staff: create/update a job opening → { ok, id }. { id?, dept, title, type?, location?, summary?, status? }. */
export const staffSaveJobOpening = callable('staffSaveJobOpening');
/** Staff: every opening incl. closed → { openings }. */
export const staffListJobOpenings = callable('staffListJobOpenings');
/** Staff: permanently remove an opening → { ok }. { id }. */
export const staffDeleteJobOpening = callable('staffDeleteJobOpening');

// ── Rider network ────────────────────────────────────────────────────────────
/** Public: apply to ride → { id, ref }. { name, email?, phone, county, vehicle, plate?, licence?, availability?, note? }. */
export const submitRiderApplication = callable('submitRiderApplication');
/** Staff: every rider application, newest first → { applications, counts }. */
export const staffListRiderApplications = callable('staffListRiderApplications');
/** Staff: move a rider application through vetting → { ok, stage }. { id, stage, note? }. */
export const staffSetRiderApplicationStage = callable('staffSetRiderApplicationStage');

// ── Staff HR + departments (Finance, Legal, People) ─────────────────────────
/** Admin: onboard an employee (grant portal access + record) → { uid, department, role }. { email, name?, title?, department?, role? }. */
export const onboardEmployee = callable('onboardEmployee');
/** Admin: offboard an employee (revoke access + mark left) → { uid }. { uid?|email? }. */
export const offboardEmployee = callable('offboardEmployee');
/** Staff: the employee directory → { employees }. */
export const listStaff = callable('listStaff');
/** Staff: add a finance entry → { id }. { type:'revenue'|'expense', category?, amount, note?, date?,
 *  behaviour? }. `behaviour` ('fixed'|'variable'|'oneoff') classifies an EXPENSE's cost behaviour —
 *  break-even needs it and a transaction log can't infer it. Omitted = unclassified (reported, not guessed). */
export const addFinanceEntry = callable('addFinanceEntry');
/** Staff: finance entries + totals → { entries, revenue, expenses, net, live }. Entries carry `behaviour`. */
export const listFinanceEntries = callable('listFinanceEntries');
/** Admin: delete a finance entry → { ok }. { id }. */
export const deleteFinanceEntry = callable('deleteFinanceEntry');
/** Staff: add/update a legal record → { id }. { id?, title, type?, status?, counterparty?, note?, date? }. */
export const saveLegalRecord = callable('saveLegalRecord');
/** Staff: list legal records → { records }. */
export const listLegalRecords = callable('listLegalRecords');
/** Admin: delete a legal record → { ok }. { id }. */
export const deleteLegalRecord = callable('deleteLegalRecord');
/** Staff: cross-platform commercial data repository → { data }. */
export const platformIntelligence = callable('platformIntelligence');
/** Staff: AI business-intelligence brief from live platform data → { insights, data }. */
export const platformInsights = callable('platformInsights', { timeout: 300000 });

// Lazily initialise Analytics only in the browser when supported + measurementId set.
export async function initAnalytics() {
  if (!app || !firebaseConfig.measurementId) return null;
  try {
    const { isSupported, getAnalytics } = await import('firebase/analytics');
    if (await isSupported()) return getAnalytics(app);
  } catch {
    /* analytics is best-effort */
  }
  return null;
}
