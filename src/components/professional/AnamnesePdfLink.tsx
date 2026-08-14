import { PDFDownloadLink } from "@react-pdf/renderer";
import { AnamneseDocument } from "@/pdf/AnamneseDocument";
import type { AnamneseDoc } from "@/types";

/**
 * Botão de exportar a anamnese. Isolado para carregar sob demanda: o
 * @react-pdf/renderer é pesado demais para entrar junto com a página.
 */
export function AnamnesePdfLink({
  anamnese,
  patientName,
  professionalName,
  professionalRegistration,
  fileName,
}: {
  anamnese: AnamneseDoc;
  patientName: string;
  professionalName: string;
  professionalRegistration?: string;
  fileName: string;
}) {
  return (
    <PDFDownloadLink
      document={
        <AnamneseDocument
          anamnese={anamnese}
          patientName={patientName}
          professionalName={professionalName}
          professionalRegistration={professionalRegistration}
        />
      }
      fileName={fileName}
      className="btn-secondary text-center"
    >
      {({ loading }) => (loading ? "Gerando PDF..." : "⬇ Exportar anamnese em PDF")}
    </PDFDownloadLink>
  );
}
