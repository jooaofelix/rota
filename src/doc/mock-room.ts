export * from "../services/room";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import { DEMO_PARTNERS, DEMO_SLOTS } from "./demo-data";

export function subscribeToPartners(_p: string, cb: (x: RoomPartnerDoc[]) => void) {
  cb(DEMO_PARTNERS);
  return () => undefined;
}
export function subscribeToRoomSlots(_p: string, cb: (x: RoomSlotDoc[]) => void) {
  cb(DEMO_SLOTS);
  return () => undefined;
}
