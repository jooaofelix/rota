import { PDFDownloadLink } from "@react-pdf/renderer";
import { RoomScheduleDocument } from "@/pdf/RoomScheduleDocument";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";

/** Isolado num componente próprio para o @react-pdf ser carregado só quando pedido. */
export function RoomSchedulePdfLink({
  ownerName,
  partners,
  slots,
  focusPartnerId,
}: {
  ownerName: string;
  partners: RoomPartnerDoc[];
  slots: RoomSlotDoc[];
  focusPartnerId?: string | null;
}) {
  const focado = focusPartnerId ? partners.find((p) => p.id === focusPartnerId) : undefined;
  const nomeArquivo = focado
    ? `escala-sala-${focado.name.toLowerCase().replace(/\s+/g, "-")}.pdf`
    : "escala-sala.pdf";

  return (
    <PDFDownloadLink
      document={
        <RoomScheduleDocument
          ownerName={ownerName}
          partners={partners}
          slots={slots}
          focusPartnerName={focado?.name}
        />
      }
      fileName={nomeArquivo}
      className="btn-secondary"
    >
      {({ loading }) =>
        loading ? "Gerando PDF..." : focado ? "⬇ PDF da escala dele(a)" : "⬇ PDF da escala completa"
      }
    </PDFDownloadLink>
  );
}
