import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ANAMNESE, chave } from "@/data/anamneseModel";
import type { AnamneseDoc } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 10.5, color: "#1f3742", fontFamily: "Helvetica" },
  header: { marginBottom: 14, borderBottom: "2 solid #3d6b7d", paddingBottom: 9 },
  title: { fontSize: 17, fontWeight: 700, marginBottom: 3 },
  meta: { fontSize: 9.5, color: "#5c8da0" },
  bloco: { marginTop: 13, paddingTop: 9, borderTop: "0.5 solid #d8e6eb" },
  blocoTitulo: { fontSize: 12, fontWeight: 700, color: "#294856", marginBottom: 4 },
  blocoRisco: { marginTop: 13, padding: 9, backgroundColor: "#fff1f2", borderLeft: "2 solid #b4524a" },
  blocoTituloRisco: { fontSize: 12, fontWeight: 700, color: "#9f1239", marginBottom: 4 },
  label: { fontSize: 8, fontWeight: 700, color: "#5c8da0", marginTop: 6, textTransform: "uppercase" },
  body: { fontSize: 10.5, lineHeight: 1.45, marginTop: 2 },
  addendum: { marginTop: 6, paddingLeft: 8, borderLeft: "1 solid #b4cdd6" },
  assinatura: { marginTop: 26, paddingTop: 8, borderTop: "0.5 solid #b4cdd6", fontSize: 9.5 },
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

/**
 * Anamnese em PDF — o documento que vai para a pasta, para o convênio ou para a
 * própria paciente quando ela pede o que existe sobre si.
 *
 * Campo vazio não vira linha em branco: some. Uma anamnese com metade dos
 * campos preenchidos deve sair como um documento de uma página, não como um
 * formulário incompleto.
 */
export function AnamneseDocument({
  anamnese,
  patientName,
  professionalName,
  professionalRegistration,
}: {
  anamnese: AnamneseDoc;
  patientName: string;
  professionalName: string;
  professionalRegistration?: string;
}) {
  const assinada = anamnese.signedAt?.toDate?.();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Anamnese</Text>
          <Text style={styles.meta}>Paciente: {safeText(patientName)}</Text>
          <Text style={styles.meta}>
            Profissional: {safeText(professionalName)}
            {professionalRegistration ? ` — ${safeText(professionalRegistration)}` : ""}
          </Text>
          <Text style={styles.meta}>
            {assinada
              ? `Encerrada em ${assinada.toLocaleDateString("pt-BR")}`
              : "Em preenchimento — documento provisório"}
            {" · "}Emitido em {new Date().toLocaleDateString("pt-BR")}
          </Text>
        </View>

        {ANAMNESE.map((bloco) => {
          const campos = bloco.campos
            .map((c) => ({ rotulo: c.rotulo, valor: safeText(anamnese.respostas?.[chave(bloco.id, c.id)]) }))
            .filter((c) => c.valor);
          if (campos.length === 0) return null;

          return (
            <View key={bloco.id} style={bloco.risco ? styles.blocoRisco : styles.bloco}>
              <Text style={bloco.risco ? styles.blocoTituloRisco : styles.blocoTitulo}>{bloco.titulo}</Text>
              {campos.map((c) => (
                <View key={c.rotulo} wrap={false}>
                  <Text style={styles.label}>{c.rotulo}</Text>
                  <Text style={styles.body}>{c.valor}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {(anamnese.addenda?.length ?? 0) > 0 && (
          <View style={styles.bloco}>
            <Text style={styles.blocoTitulo}>Adendos</Text>
            {anamnese.addenda!.map((a, i) => (
              <View key={i} style={styles.addendum}>
                <Text style={styles.body}>{safeText(a.texto)}</Text>
                <Text style={styles.label}>
                  Registrado em {a.createdAt?.toDate?.().toLocaleDateString("pt-BR")}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.assinatura}>
          <Text>{safeText(professionalName)}</Text>
          {professionalRegistration ? <Text>{safeText(professionalRegistration)}</Text> : null}
        </View>

        <Text style={styles.footer} fixed>
          Documento de prontuário psicológico. Sigiloso, nos termos da Resolução CFP 001/2009 e do Código de
          Ética Profissional do Psicólogo.
        </Text>
      </Page>
    </Document>
  );
}
