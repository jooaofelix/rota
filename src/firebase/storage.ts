import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./config";

/** Envia um arquivo (imagem, áudio, relatório) e retorna a URL pública de download. */
export async function uploadFile(path: string, file: File | Blob): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function removeFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path)).catch(() => undefined);
}

export function activityMediaPath(patientId: string, routineItemId: string, filename: string) {
  return `patients/${patientId}/activities/${routineItemId}/${Date.now()}_${filename}`;
}

export function reportFilePath(patientId: string, reportId: string) {
  return `patients/${patientId}/reports/${reportId}.pdf`;
}
