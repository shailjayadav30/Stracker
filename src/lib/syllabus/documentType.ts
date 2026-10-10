import type { DocumentType } from "../../generated/prisma/client.js";

// API uses the same lowercase values as the AI schema ("competitive_exam"), the DB uses the enum
export function toApiDocumentType(type: DocumentType | null) {
  return type ? type.toLowerCase() : null;
}
