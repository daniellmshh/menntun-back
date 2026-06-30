import { NivelEducativo } from "@prisma/client";

export function getSepPdfSourceFile(
  level: NivelEducativo,
  order: number,
): string {
  const mapping: Record<string, string> = {
    "PREESCOLAR-1": "preescolar-1.pdf",
    "PREESCOLAR-2": "preescolar-2.pdf",
    "PREESCOLAR-3": "preescolar-3.pdf",
    "PRIMARIA-1": "primaria-1.pdf",
    "PRIMARIA-2": "primaria-2.pdf",
    "PRIMARIA-3": "primaria-3.pdf",
    "PRIMARIA-4": "primaria-4.pdf",
    "PRIMARIA-5": "primaria-5.pdf",
    "PRIMARIA-6": "primaria-6.pdf",
    "SECUNDARIA-1": "secundaria-1.pdf",
    "SECUNDARIA-2": "secundaria-2.pdf",
    "SECUNDARIA-3": "secundaria-3.pdf",
  };

  const key = `${level}-${order}`;
  const file = mapping[key];

  if (!file) {
    throw new Error(
      `No SEP PDF mapping found for level=${level} order=${order}`,
    );
  }

  return file;
}
