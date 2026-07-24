import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type WithFieldValue } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { RewardAchievementDoc, RewardDoc } from "@/types";
import { createNotification } from "./notifications";

export function subscribeToPatientRewards(patientId: string, callback: (rewards: RewardDoc[]) => void) {
  const q = query(collection(db, "rewards"), where("patientId", "==", patientId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RewardDoc)));
  });
}

export function subscribeToAchievements(patientId: string, callback: (items: RewardAchievementDoc[]) => void) {
  const q = query(
    collection(db, "rewardAchievements"),
    where("patientId", "==", patientId),
    orderBy("achievedAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RewardAchievementDoc)));
  });
}

export async function createManualReward(
  professionalId: string,
  patientId: string,
  data: Pick<RewardDoc, "name" | "description" | "icon" | "pointsRequired" | "incentiveMessage" | "requiresApproval">
): Promise<string> {
  const ref = await addDoc(collection(db, "rewards"), {
    ...data,
    patientId,
    professionalId,
    criteriaType: "manual",
    status: "available",
    isAutomatic: false,
    createdAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<RewardDoc, "id">>);

  await createNotification({
    recipientId: patientId,
    type: "new_reward",
    title: "Você recebeu uma nova recompensa!",
    body: `"${data.name}" está te esperando.`,
    url: "/recompensas",
  });

  return ref.id;
}

/** A profissional entrega diretamente uma recompensa ao paciente, mesmo sem pontuação vinculada. */
export async function deliverRewardDirectly(professionalId: string, patientId: string, reward: RewardDoc): Promise<void> {
  await addDoc(collection(db, "rewardAchievements"), {
    patientId,
    rewardId: reward.id,
    rewardName: reward.name,
    icon: reward.icon,
    awardedBy: "professional",
    approvedByProfessionalId: professionalId,
    pendingApproval: false,
    achievedAt: serverTimestamp(),
  } satisfies WithFieldValue<Omit<RewardAchievementDoc, "id">>);

  await updateDoc(doc(db, "rewards", reward.id), { status: "claimed" });

  await createNotification({
    recipientId: patientId,
    type: "reward_achieved",
    title: "Recompensa conquistada!",
    body: `Parabéns! Você recebeu "${reward.name}".`,
    url: "/recompensas",
  });
}
