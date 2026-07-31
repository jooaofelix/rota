import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, color: "#154238", fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  meta: { fontSize: 9, color: "#6b7a99", marginBottom: 12 },
  headRow: { flexDirection: "row", borderBottom: "1 solid #4f46e5", paddingBottom: 4, marginBottom: 2 },
  headCell: { flex: 1, fontSize: 8.5, fontWeight: 700, color: "#4338ca", textAlign: "center" },
  hourCell: { width: 54, fontSize: 8.5, fontWeight: 700, color: "#6b7a99" },
  row: { flexDirection: "row", minHeight: 16, borderBottom: "0.5 solid #eef0f7", alignItems: "center" },
  cell: { flex: 1, fontSize: 8, textAlign: "center", paddingVertical: 2, marginHorizontal: 1, borderRadius: 2 },
  listTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 5, color: "#4338ca" },
  listRow: { marginBottom: 3 },
  footer: {
    position: "absolute", bottom: 20, left: 30, right: 30,
    fontSize: 7.5, color: "#94a3b8", textAlign: "center",
  },
});

const WINANSI_EXTRAS = "–—‘’“”†‡•…‰‹›€™";
function safeText(v: string | undefined): string {
  if (!v) return "";
  return Array.from(v).filter((c) => c.codePointAt(0)! <= 0xff || WINANSI_EXTRAS.includes(c)).join("").trim();
}

const ORDEM = [1, 2, 3, 4, 5, 6, 0];
const CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function minutos(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * A escala da sala em PDF, no mesmo formato da planilha que a profissional usava:
 * uma linha por faixa de hora, uma coluna por dia. Quando a exportação é de um
 * profissional só, sai também a lista dos horários dele, que é o que ele precisa ler.
 */
export function RoomScheduleDocument({
  ownerName,
  partners,
  slots,
  focusPartnerName,
}: {
  ownerName: string;
  partners: RoomPartnerDoc[];
  slots: RoomSlotDoc[];
  focusPartnerName?: string;
}) {
  const inicio = slots.length ? Math.min(...slots.map((s) => Math.floor(minutos(s.startTime) / 60))) : 7;
  const fim = slots.length ? Math.max(...slots.map((s) => Math.ceil(minutos(s.endTime) / 60))) : 20;
  const horas = Array.from({ length: Math.max(fim - inicio, 1) }, (_, i) => inicio + i);

  const corDe = (partnerId: string) => partners.find((p) => p.id === partnerId)?.color ?? "#e0e7ff";

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>
          {focusPartnerName ? `Escala da sala — ${safeText(focusPartnerName)}` : "Escala da sala"}
        </Text>
        <Text style={styles.meta}>
          Responsável: {safeText(ownerName)} · Emitida em {new Date().toLocaleDateString("pt-BR")} ·
          A escala se repete toda semana
        </Text>

        <View style={styles.headRow}>
          <Text style={styles.hourCell}>Horário</Text>
          {ORDEM.map((wd) => (
            <Text key={wd} style={styles.headCell}>{CURTO[wd]}</Text>
          ))}
        </View>

        {horas.map((hora) => {
          const faixaInicio = hora * 60;
          const faixaFim = faixaInicio + 60;
          return (
            <View key={hora} style={styles.row}>
              <Text style={styles.hourCell}>
                {String(hora).padStart(2, "0")}:00 - {String(hora + 1).padStart(2, "0")}:00
              </Text>
              {ORDEM.map((wd) => {
                // Ocupa a faixa quem começa antes do fim dela e termina depois do início.
                const ocupa = slots.find(
                  (s) => s.weekday === wd && minutos(s.startTime) < faixaFim && minutos(s.endTime) > faixaInicio
                );
                return (
                  <Text
                    key={wd}
                    style={[
                      styles.cell,
                      ocupa ? { backgroundColor: corDe(ocupa.partnerId), color: "#ffffff" } : {},
                    ]}
                  >
                    {ocupa ? safeText(ocupa.partnerName) : ""}
                  </Text>
                );
              })}
            </View>
          );
        })}

        {focusPartnerName && (
          <>
            <Text style={styles.listTitle}>Seus horários</Text>
            {ORDEM.map((wd) => {
              const doDia = slots
                .filter((s) => s.weekday === wd)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              if (doDia.length === 0) return null;
              return (
                <Text key={wd} style={styles.listRow}>
                  {NOMES[wd]}:{" "}
                  {doDia
                    .map((s) => `${s.startTime} às ${s.endTime}${s.room ? ` (${safeText(s.room)})` : ""}`)
                    .join(", ")}
                </Text>
              );
            })}
          </>
        )}

        <Text style={styles.footer} fixed>
          Escala fixa semanal. Trocas pontuais devem ser combinadas com {safeText(ownerName)}. Gerado pelo ROTA.
        </Text>
      </Page>
    </Document>
  );
}
