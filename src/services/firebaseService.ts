import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ContractData, DiscountData } from '../types';

export interface SavedDiscountItem extends DiscountData {
  id?: string;
  clientName?: string;
  createdAt?: any;
}

export function subscribeToAudits(onUpdate: (audits: ContractData[]) => void) {
  try {
    const q = query(collection(db, 'audits'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: ContractData[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ContractData, 'id'>)
      }));
      onUpdate(list);
    }, (error) => {
      console.warn("Firestore subscription error (audits):", error);
    });
  } catch (err) {
    console.warn("Failed to subscribe to audits in Firestore:", err);
    return () => {};
  }
}

export async function saveAuditToFirestore(audit: Omit<ContractData, 'id'>) {
  try {
    const ref = await addDoc(collection(db, 'audits'), {
      ...audit,
      createdAt: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    console.error("Error saving audit to Firestore:", err);
    throw err;
  }
}

export async function deleteAuditFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, 'audits', id));
  } catch (err) {
    console.error("Error deleting audit from Firestore:", err);
  }
}

export async function clearAllAuditsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, 'audits'));
    const promises = snapshot.docs.map((d) => deleteDoc(doc(db, 'audits', d.id)));
    await Promise.all(promises);
  } catch (err) {
    console.error("Error clearing audits from Firestore:", err);
  }
}

export function subscribeToDiscounts(onUpdate: (discounts: SavedDiscountItem[]) => void) {
  try {
    const q = query(collection(db, 'discounts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: SavedDiscountItem[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedDiscountItem, 'id'>)
      }));
      onUpdate(list);
    }, (error) => {
      console.warn("Firestore subscription error (discounts):", error);
    });
  } catch (err) {
    console.warn("Failed to subscribe to discounts in Firestore:", err);
    return () => {};
  }
}

export async function saveDiscountToFirestore(discount: SavedDiscountItem) {
  try {
    const ref = await addDoc(collection(db, 'discounts'), {
      ...discount,
      createdAt: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    console.error("Error saving discount to Firestore:", err);
    throw err;
  }
}

export async function deleteDiscountFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, 'discounts', id));
  } catch (err) {
    console.error("Error deleting discount from Firestore:", err);
  }
}
