import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, limit, type WithFieldValue } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { MessageDoc } from "@/types";
import { createNotification } from "./notifications";

export async function sendMessageToPatient(professionalId: string, patientId: string, text: string): Promise<void> {
  await addDoc(collection(db, "messages"), {
    professionalId,
    patientId,
    text,
    read: false,
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<MessageDoc, "id">>);

  await createNotification({
    recipientId: patientId,
    type: "new_message",
    title: "Nova mensagem da sua profissional",
    body: text.length > 80 ? `${text.slice(0, 80)}...` : text,
    url: "/hoje",
  });
}

export function subscribeToPatientMessages(patientId: string, callback: (items: MessageDoc[]) => void) {
  const q = query(
    collection(db, "messages"),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MessageDoc)));
  });
}
