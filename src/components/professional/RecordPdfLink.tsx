import { PDFDownloadLink } from "@react-pdf/renderer";
import { SessionRecordDocument } from "@/pdf/SessionRecordDocument";
import type { SessionRecordDoc } from "@/types";

/**
 * Botão de exportar o prontuário em PDF.
 *
 * Fica isolado num componente próprio para ser carregado sob demanda: o
 * @react-pdf/renderer é pesado e não deve entrar no bundle inicial só porque a
 * agenda existe.
 */
export function RecordPdfLink({
  patientName,
  professionalName,
  professionalRegistration,
  records,
  fileName,
  label = "⬇ Exportar em PDF",
}: {
  patientName: string;
  professionalName: string;
  professionalRegistration?: string;
  records: SessionRecordDoc[];
  fileName: string;
  label?: string;
}) {
  return (
    <PDFDownloadLink
      document={
        <SessionRecordDocument
          patientName={patientName}
          professionalName={professionalName}
          professionalRegistration={professionalRegistration}
          records={records}
        />
      }
      fileName={fileName}
      className="btn-secondary"
    >
      {({ loading }) => (loading ? "Gerando PDF..." : label)}
    </PDFDownloadLink>
  );
}
