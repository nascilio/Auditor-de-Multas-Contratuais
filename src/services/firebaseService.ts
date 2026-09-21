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

export const RETENTION_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

export function subscribeToAudits(onUpdate: (audits: ContractData[]) => void) {
  try {
    const q = query(collection(db, 'audits'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const validList: ContractData[] = [];
      const expiredDocIds: string[] = [];

      snapshot.docs.forEach((d) => {
        const raw = d.data();
        let createdTime: number = now;

        if (typeof raw.createdAt === 'number') {
          createdTime = raw.createdAt;
        } else if (raw.serverTime?.toMillis) {
          createdTime = raw.serverTime.toMillis();
        } else if (typeof raw.createdAt === 'string') {
          const parsed = new Date(raw.createdAt).getTime();
          if (!isNaN(parsed)) createdTime = parsed;
        }

        const isExpired = (now - createdTime) >= RETENTION_PERIOD_MS;
        if (isExpired) {
          expiredDocIds.push(d.id);
        } else {
          validList.push({
            id: d.id,
            signatureDate: raw.signatureDate,
            monthlyFee: raw.monthlyFee,
            requestDate: raw.requestDate,
            clientName: raw.clientName,
            contractNumber: raw.contractNumber,
            notes: raw.notes,
            createdAt: createdTime,
            expiresAt: raw.expiresAt || (createdTime + RETENTION_PERIOD_MS)
          });
        }
      });

      // Purga em segundo plano os documentos com mais de 24 horas
      if (expiredDocIds.length > 0) {
        expiredDocIds.forEach((id) => {
          deleteDoc(doc(db, 'audits', id)).catch((err) => {
            console.warn("Erro ao autoexcluir auditoria expirada do Firestore:", err);
          });
        });
      }

      onUpdate(validList);
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
    const now = Date.now();
    const expiresAt = now + RETENTION_PERIOD_MS;
    const ref = await addDoc(collection(db, 'audits'), {
      ...audit,
      createdAt: now,
      expiresAt: expiresAt,
      serverTime: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    console.error("Error saving audit to Firestore:", err);
    throw err;
  }
}

export async function purgeExpiredAuditsFromFirestore(): Promise<number> {
  try {
    const now = Date.now();
    const snapshot = await getDocs(collection(db, 'audits'));
    const toDelete: string[] = [];

    snapshot.docs.forEach((d) => {
      const data = d.data();
      let createdTime: number | null = null;
      if (typeof data.createdAt === 'number') {
        createdTime = data.createdAt;
      } else if (data.serverTime?.toMillis) {
        createdTime = data.serverTime.toMillis();
      } else if (typeof data.createdAt === 'string') {
        const parsed = new Date(data.createdAt).getTime();
        if (!isNaN(parsed)) createdTime = parsed;
      }

      // Se não tiver data ou se a data for mais antiga que 24 horas
      if (!createdTime || (now - createdTime) >= RETENTION_PERIOD_MS) {
        toDelete.push(d.id);
      }
    });

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map((id) => deleteDoc(doc(db, 'audits', id))));
    }
    return toDelete.length;
  } catch (err) {
    console.warn("Falha ao purgar auditorias expiradas:", err);
    return 0;
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
