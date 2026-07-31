export * from "../services/roomRequests";
import type { RoomRequestDoc } from "@/types";
import { DEMO_REQUESTS } from "./demo-data";

export function subscribeToRoomRequests(_p: string, cb: (r: RoomRequestDoc[]) => void) {
  cb(DEMO_REQUESTS);
  return () => undefined;
}
export async function getRoomRequest() {
  return DEMO_REQUESTS.find((r) => r.status === "pending") ?? null;
}
export async function createRoomRequest() {
  /* nas capturas nada é gravado */
}
