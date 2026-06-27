// account.js — shopper profile + address-book writes (client-side, owner-scoped).
// users/{uid} profile fields (name/phone/defaultHubId) are owner-updatable (not
// `points`, which is server-only); addresses live in users/{uid}/addresses.
import {
  doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, writeBatch, getDocs,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth, firebaseEnabled } from './firebase.js';

const ready = (uid) => Boolean(firebaseEnabled && db && uid);

/** Merge profile fields onto users/{uid} (name, phone, defaultHubId). */
export function saveProfile(uid, patch) {
  if (!ready(uid)) return Promise.resolve();
  return setDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

/** Save a new avatar: users/{uid}.photoUrl + the Firebase Auth photoURL. */
export async function updateAvatar(uid, url) {
  if (!ready(uid)) return;
  await setDoc(doc(db, 'users', uid), { photoUrl: url, updatedAt: serverTimestamp() }, { merge: true });
  try { if (auth?.currentUser) await updateProfile(auth.currentUser, { photoURL: url }); } catch { /* non-fatal */ }
}

/** Live address book for the user. cb receives an array; returns an unsubscribe fn. */
export function subscribeAddresses(uid, cb) {
  if (!ready(uid)) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, 'users', uid, 'addresses'),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export function addAddress(uid, a) {
  if (!ready(uid)) return Promise.resolve();
  return addDoc(collection(db, 'users', uid, 'addresses'), { ...a, createdAt: serverTimestamp() });
}
export function updateAddress(uid, id, a) {
  if (!ready(uid)) return Promise.resolve();
  return updateDoc(doc(db, 'users', uid, 'addresses', id), a);
}
export function deleteAddress(uid, id) {
  if (!ready(uid)) return Promise.resolve();
  return deleteDoc(doc(db, 'users', uid, 'addresses', id));
}

/** Live list of stores the user follows. cb receives an array; returns unsubscribe. */
export function subscribeFollows(uid, cb) {
  if (!ready(uid)) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, 'users', uid, 'follows'),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
/** Follow a store (stored at users/{uid}/follows/{storeId}). */
export function followStore(uid, store) {
  if (!ready(uid) || !store?.id) return Promise.resolve();
  return setDoc(doc(db, 'users', uid, 'follows', String(store.id)), {
    storeId: String(store.id),
    name: store.name || '',
    icon: store.icon || 'fa-store',
    tint: store.tint || '#4f46e5',
    ...(store.img ? { img: store.img } : {}),
    followedAt: serverTimestamp(),
  });
}
/** Unfollow a store. */
export function unfollowStore(uid, storeId) {
  if (!ready(uid) || !storeId) return Promise.resolve();
  return deleteDoc(doc(db, 'users', uid, 'follows', String(storeId)));
}

/** Make one address the default (clears the flag on the others). */
export async function setDefaultAddress(uid, id) {
  if (!ready(uid)) return;
  const snap = await getDocs(collection(db, 'users', uid, 'addresses'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { default: d.id === id }));
  await batch.commit();
}
