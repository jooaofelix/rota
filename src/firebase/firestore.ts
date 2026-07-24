import type { FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore";

/**
 * Converter genérico: guarda o documento como está, apenas garantindo o campo `id`.
 * Evita repetir toObject/fromObject em cada serviço.
 */
export function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      const { id: _id, ...rest } = data;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return { id: snapshot.id, ...snapshot.data() } as T;
    },
  };
}
