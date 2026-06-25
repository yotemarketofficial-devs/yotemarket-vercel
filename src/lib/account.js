// account.js — shopper profile + address-book writes (client-side, owner-scoped).
// users/{uid} profile fields (name/phone/defaultHubId) are owner-updatable (not
// `points`, which is server-only); addresses live in users/{uid}/addresses.
import {
  doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, writeBatch, getDocs,
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase.js';

const ready = (uid) => Boolean(firebaseEnabled && db && uid);

/** Merge profile fields onto users/{uid} (name, phone, defaultHubId). */
export function saveProfile(uid, patch) {
  if (!ready(uid)) return Promise.resolve();
  return setDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
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

/** Make one address the default (clears the flag on the others). */
export async function setDefaultAddress(uid, id) {
  if (!ready(uid)) return;
  const snap = await getDocs(collection(db, 'users', uid, 'addresses'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { default: d.id === id }));
  await batch.commit();
}
