import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { SessionRecordDoc } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 10.5, color: "#154238", fontFamily: "Helvetica" },
  header: { marginBottom: 14, borderBottom: "2 solid #4f46e5", paddingBottom: 9 },
  title: { fontSize: 17, fontWeight: 700, marginBottom: 3 },
  meta: { fontSize: 9.5, color: "#5a6b8b" },
  entry: { marginTop: 14, paddingTop: 10, borderTop: "0.5 solid #e3e6f3" },
  entryDate: { fontSize: 12, fontWeight: 700, color: "#4338ca", marginBottom: 5 },
  label: { fontSize: 8, fontWeight: 700, color: "#6b7a99", marginTop: 6, textTransform: "uppercase" },
  body: { fontSize: 10.5, lineHeight: 1.45, marginTop: 2 },
  risk: { marginTop: 7, padding: 7, backgroundColor: "#fff1f2", borderLeft: "2 solid #e11d48" },
  riskLabel: { fontSize: 8.5, fontWeight: 700, color: "#9f1239" },
  addendum: { marginTop: 6, paddingLeft: 8, borderLeft: "1 solid #c7d2fe" },
  signed: { marginTop: 6, fontSize: 8.5, color: "#6b7a99", fontStyle: "italic" },
  footer: {
    position: "absolute", bottom: 24, left: 34, right: 34,
    fontSize: 7.5, color: "#94a3b8", textAlign: "center",
  },
});

/** As fontes embutidas cobrem só WinAnsi; emoji vira glifo quebrado sobre a letra seguinte. */
const WINANSI_EXTRAS = "–—‘’“”†‡•…‰‹›€™";

function safeText(value: string | undefined): string {
  if (!value) return "";
  return Array.from(value)
    .filter((ch) => ch.codePointAt(0)! <= 0xff || WINANSI_EXTRAS.includes(ch))
    .join("")
    .trim();
}

function Campo({ label, value }: { label: string; value?: string }) {
  const text = safeText(value);
  if (!text) return null;
  return (
    <View wrap={false}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

interface SessionRecordDocumentProps {
  patientName: string;
  professionalName: string;
  professionalRegistration?: string;
  records: SessionRecordDoc[];
}

/**
 * Prontuário em PDF: uma entrada por sessão, da mais recente para a mais antiga.
 * Serve tanto para exportar uma sessão avulsa quanto o histórico inteiro — a
 * diferença está apenas em quantos registros são passados.
 */
export function SessionRecordDocument({
  patientName,
  professionalName,
  professionalRegistration,
  records,
}: SessionRecordDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Registro documental de sessões</Text>
          <Text style={styles.meta}>Paciente: {safeText(patientName)}</Text>
          <Text style={styles.meta}>
            Profissional: {safeText(professionalName)}
            {professionalRegistration ? ` — ${safeText(professionalRegistration)}` : ""}
          </Text>
          <Text style={styles.meta}>
            Emitido em {new Date().toLocaleDateString("pt-BR")} · {records.length}{" "}
            {records.length === 1 ? "registro" : "registros"}
          </Text>
        </View>

        {records.map((r) => (
          <View key={r.id} style={styles.entry}>
            <Text style={styles.entryDate}>
              {r.date.split("-").reverse().join("/")}
              {r.signedAt ? "" : "  (não assinado)"}
            </Text>

            <Campo label="Demanda do dia" value={r.complaint} />
            <Campo label="Evolução" value={r.evolution} />
            <Campo label="Procedimentos e técnicas" value={r.interventions} />
            <Campo label="Estado e apresentação" value={r.patientState} />
            <Campo label="Plano para o próximo encontro" value={r.plan} />
            <Campo label="Combinado com o paciente" value={r.homework} />
            <Campo label="Encaminhamentos" value={r.referral} />

            {r.riskFlag && (
              <View style={styles.risk}>
                <Text style={styles.riskLabel}>ATENÇÃO A RISCO</Text>
                <Text style={styles.body}>{safeText(r.riskNote) || "Sinalizado pela profissional."}</Text>
              </View>
            )}

            {r.addenda?.map((a, i) => (
              <View key={i} style={styles.addendum}>
                <Text style={styles.label}>Adendo</Text>
                <Text style={styles.body}>{safeText(a.text)}</Text>
              </View>
            ))}

            {r.signedAt && (
              <Text style={styles.signed}>
                Registro encerrado em {r.signedAt.toDate().toLocaleDateString("pt-BR")}.
              </Text>
            )}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          Documento sigiloso, de guarda e responsabilidade da profissional signatária. Resolução CFP 001/2009.
          Gerado pelo ROTA.
        </Text>
      </Page>
    </Document>
  );
}
