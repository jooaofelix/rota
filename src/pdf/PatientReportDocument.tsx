import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportData } from "@/services/reportData";
import type { ReportKind, SessionRecordDoc } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#154238", fontFamily: "Helvetica" },
  header: { marginBottom: 16, borderBottom: "2 solid #2f9a7c", paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#5a8b7d" },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#217c64" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  statBox: { flexDirection: "row", gap: 12, marginBottom: 6 },
  stat: { flex: 1, backgroundColor: "#eefaf6", padding: 8, borderRadius: 4 },
  statValue: { fontSize: 16, fontWeight: 700 },
  statLabel: { fontSize: 8, color: "#5a8b7d" },
  item: { marginBottom: 4, paddingBottom: 4, borderBottom: "0.5 solid #e5f2ee" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#9db8ae", textAlign: "center" },
});

/**
 * As fontes embutidas do PDF (Helvetica) só cobrem WinAnsi. Um emoji — no título de
 * uma atividade, num comentário — vira um glifo quebrado que se sobrepõe à letra
 * seguinte, então texto vindo do usuário passa por aqui antes de ser desenhado.
 */
const WINANSI_EXTRAS = "–—‘’“”†‡•…‰‹›€™";

function safeText(value: string | undefined): string {
  if (!value) return "";
  return Array.from(value)
    .filter((ch) => ch.codePointAt(0)! <= 0xff || WINANSI_EXTRAS.includes(ch))
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const KIND_LABELS: Record<ReportKind, string> = {
  summary: "Relatório resumido",
  full: "Relatório completo",
  patient: "Relatório para o paciente",
  guardian: "Relatório para responsáveis",
  medical_record: "Relatório para prontuário",
  custom: "Relatório personalizado",
};

interface PatientReportDocumentProps {
  patientName: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  kind: ReportKind;
  data: ReportData;
  observation?: string;
  /** Registros clínicos do período, incluídos só quando a profissional pedir. */
  records?: SessionRecordDoc[];
  sections: {
    activities: boolean;
    feelings: boolean;
    comments: boolean;
    rewards: boolean;
    professionalNotes: boolean;
    records?: boolean;
  };
}

export function PatientReportDocument({
  patientName,
  professionalName,
  periodStart,
  periodEnd,
  kind,
  data,
  observation,
  records,
  sections,
}: PatientReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{KIND_LABELS[kind]}</Text>
          <Text style={styles.subtitle}>Paciente: {safeText(patientName)}</Text>
          <Text style={styles.subtitle}>Período: {periodStart} a {periodEnd}</Text>
          <Text style={styles.subtitle}>Emitido em {new Date().toLocaleDateString("pt-BR")} por {safeText(professionalName)}</Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.completionRate}%</Text>
            <Text style={styles.statLabel}>Taxa de conclusão</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.totalCompleted}</Text>
            <Text style={styles.statLabel}>Atividades concluídas</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{data.totalPoints}</Text>
            <Text style={styles.statLabel}>Pontos no período</Text>
          </View>
        </View>

        {sections.activities && data.categoryAdherence.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adesão por categoria</Text>
            {data.categoryAdherence.map((c) => (
              <View key={c.label} style={styles.row}>
                <Text>{c.label}</Text>
                <Text>{c.rate}%</Text>
              </View>
            ))}
          </View>
        )}

        {sections.activities && data.notRealized.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Atividades não realizadas</Text>
            {data.notRealized.slice(0, 15).map((n, i) => (
              <View key={i} style={styles.item}>
                <Text>{n.date} — {safeText(n.title)}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.feelings && data.feelingCounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sentimentos registrados</Text>
            {data.feelingCounts.map((f) => (
              <View key={f.label} style={styles.row}>
                <Text>{f.label}</Text>
                <Text>{f.count}x</Text>
              </View>
            ))}
          </View>
        )}

        {sections.comments && data.comments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comentários do paciente</Text>
            {data.comments.slice(0, 20).map((c, i) => (
              <View key={i} style={styles.item}>
                <Text>{c.date} — {safeText(c.title)}</Text>
                <Text style={{ fontStyle: "italic", color: "#5a8b7d" }}>"{safeText(c.comment)}"</Text>
              </View>
            ))}
          </View>
        )}

        {sections.records && records && records.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>Registros das sessões</Text>
            {records.map((r) => (
              <View key={r.id} style={styles.item} wrap={false}>
                <Text style={{ fontWeight: 700 }}>
                  {r.date.split("-").reverse().join("/")}
                  {r.riskFlag ? "  — atenção a risco" : ""}
                </Text>
                {safeText(r.complaint) !== "" && <Text>Demanda: {safeText(r.complaint)}</Text>}
                <Text>{safeText(r.evolution)}</Text>
                {safeText(r.plan) !== "" && <Text>Plano: {safeText(r.plan)}</Text>}
              </View>
            ))}
          </View>
        )}

        {sections.professionalNotes && observation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observação da profissional</Text>
            <Text>{safeText(observation)}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Este relatório apresenta informações e padrões de rotina — não constitui diagnóstico. Gerado pelo ROTA.
        </Text>
      </Page>
    </Document>
  );
}
