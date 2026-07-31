import { useEffect, useState } from "react";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToLinkedPatients } from "@/services/patients";
import { getPatientsOverview, type PatientOverview } from "@/services/professionalOverview";
import { getReportData, type ReportData } from "@/services/reportData";
import { saveReportRecord, subscribeToPatientReports } from "@/services/reports";
import { uploadFile, reportFilePath } from "@/firebase/storage";
import { pdf } from "@react-pdf/renderer";
import { PatientReportDocument } from "@/pdf/PatientReportDocument";
import type { ProfessionalPatientLink, ReportDoc, ReportKind, SessionRecordDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { EmptyState } from "@/components/common/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fetchPatientRecords } from "@/services/sessions";
import { todayKey } from "@/utils/date";
import clsx from "clsx";

const KIND_OPTIONS: Array<{ key: ReportKind; label: string }> = [
  { key: "summary", label: "Resumido" },
  { key: "full", label: "Completo" },
  { key: "patient", label: "Para o paciente" },
  { key: "guardian", label: "Para responsáveis" },
  { key: "medical_record", label: "Para prontuário" },
  { key: "custom", label: "Personalizado" },
];

function daysAgoKey(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return todayKey(d);
}

export function ReportsPage() {
  const { firebaseUser, userDoc } = useAuth();
  const { showToast } = useToast();
  const [links, setLinks] = useState<ProfessionalPatientLink[]>([]);
  const [patients, setPatients] = useState<PatientOverview[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState(daysAgoKey(7));
  const [periodEnd, setPeriodEnd] = useState(todayKey());
  const [kind, setKind] = useState<ReportKind>("summary");
  const [sections, setSections] = useState({
    activities: true, feelings: true, comments: true, rewards: true,
    charts: true, professionalNotes: true, records: false,
  });
  const [records, setRecords] = useState<SessionRecordDoc[]>([]);
  const [observation, setObservation] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingReports, setExistingReports] = useState<ReportDoc[]>([]);

  // Os registros só são buscados quando a opção está marcada: é dado sigiloso,
  // não faz sentido carregar em toda abertura da tela.
  useEffect(() => {
    if (!patientId || !sections.records) {
      setRecords([]);
      return;
    }
    fetchPatientRecords(patientId).then((all) =>
      setRecords(all.filter((r) => r.date >= periodStart && r.date <= periodEnd))
    );
  }, [patientId, sections.records, periodStart, periodEnd]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToLinkedPatients(firebaseUser.uid, setLinks);
  }, [firebaseUser]);

  useEffect(() => {
    if (links.length === 0) return;
    getPatientsOverview(links.map((l) => l.patientId)).then((list) => {
      setPatients(list);
      if (!patientId && list[0]) setPatientId(list[0].patientId);
    });
  }, [links]);

  useEffect(() => {
    if (!patientId) return;
    return subscribeToPatientReports(patientId, setExistingReports);
  }, [patientId]);

  async function handleGenerate() {
    if (!patientId) return;
    const data = await getReportData(patientId, periodStart, periodEnd);
    setReportData(data);
    setShowPreview(true);
  }

  async function handleSave() {
    if (!reportData || !firebaseUser || !patientId) return;
    setSaving(true);
    try {
      const blob = await pdf(
        <PatientReportDocument
          patientName={patients.find((p) => p.patientId === patientId)?.name ?? ""}
          professionalName={userDoc?.name ?? ""}
          periodStart={periodStart}
          periodEnd={periodEnd}
          kind={kind}
          data={reportData}
          observation={observation}
          records={records}
          sections={sections}
        />
      ).toBlob();

      const reportId = crypto.randomUUID();
      const fileUrl = await uploadFile(reportFilePath(patientId, reportId), blob);

      await saveReportRecord({
        patientId,
        professionalId: firebaseUser.uid,
        kind,
        periodStart,
        periodEnd,
        includedSections: sections,
        professionalObservation: observation,
        fileUrl,
      });

      showToast("Relatório salvo com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  const selectedPatientName = patients.find((p) => p.patientId === patientId)?.name ?? "";

  return (
    <div>
      <TopBar title="Relatórios" subtitle="Gere relatórios em PDF para cada paciente" />

      <div className="flex flex-col gap-3 px-4 pb-4">
        {patients.length === 0 ? (
          <EmptyState icon="📄" title="Nenhum paciente vinculado" description="Vincule um paciente para gerar relatórios." />
        ) : (
          <>
            <div>
              <p className="mb-1 text-xs font-bold text-brand-500">Paciente</p>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="input-field">
                {patients.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs font-bold text-brand-500">De</p>
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-brand-500">Até</p>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold text-brand-500">Tipo de relatório</p>
              <div className="flex flex-wrap gap-1.5">
                {KIND_OPTIONS.map((k) => (
                  <button
                    key={k.key}
                    onClick={() => setKind(k.key)}
                    className={clsx("rounded-full px-3 py-1.5 text-xs font-bold", kind === k.key ? "bg-brand-500 text-white" : "bg-white text-brand-500")}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <p className="mb-2 text-sm font-bold text-brand-700">O que incluir no relatório</p>
              {(
                [
                  ["activities", "Atividades e adesão"],
                  ["feelings", "Sentimentos registrados"],
                  ["comments", "Comentários do paciente"],
                  ["rewards", "Recompensas conquistadas"],
                  ["charts", "Gráficos e indicadores"],
                  ["professionalNotes", "Sua observação"],
                  ["records", "Registros das sessões (prontuário)"],
                ] as Array<[keyof typeof sections, string]>
              ).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between py-1 text-sm text-brand-600">
                  {label}
                  <input
                    type="checkbox"
                    checked={sections[key]}
                    onChange={(e) => setSections((s) => ({ ...s, [key]: e.target.checked }))}
                    className="h-5 w-5 rounded border-brand-300"
                  />
                </label>
              ))}
            </div>

            {(kind === "guardian" || kind === "patient") && (
              <div className="card border-2 border-amber-100 bg-amber-50">
                <p className="text-xs font-bold text-amber-700">
                  Antes de enviar para {kind === "guardian" ? "responsáveis" : "o paciente"}, revise cuidadosamente quais informações vão aparecer. Evite compartilhar observações clínicas sensíveis sem necessidade.
                </p>
              </div>
            )}

            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Observação da profissional (opcional)"
            />

            <button className="btn-primary" onClick={handleGenerate}>
              Gerar prévia do relatório
            </button>

            {showPreview && reportData && (
              <div className="flex flex-col gap-2">
                <div className="h-96 overflow-hidden rounded-2xl border-2 border-brand-100">
                  <PDFViewer width="100%" height="100%" showToolbar={false}>
                    <PatientReportDocument
                      patientName={selectedPatientName}
                      professionalName={userDoc?.name ?? ""}
                      periodStart={periodStart}
                      periodEnd={periodEnd}
                      kind={kind}
                      data={reportData}
                      observation={observation}
                      records={records}
                      sections={sections}
                    />
                  </PDFViewer>
                </div>

                <PDFDownloadLink
                  document={
                    <PatientReportDocument
                      patientName={selectedPatientName}
                      professionalName={userDoc?.name ?? ""}
                      periodStart={periodStart}
                      periodEnd={periodEnd}
                      kind={kind}
                      data={reportData}
                      observation={observation}
                      records={records}
                      sections={sections}
                    />
                  }
                  fileName={`relatorio-${selectedPatientName}-${periodStart}-a-${periodEnd}.pdf`}
                  className="btn-secondary text-center"
                >
                  {({ loading }) => (loading ? "Preparando PDF..." : "Baixar PDF")}
                </PDFDownloadLink>

                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar relatório no histórico do paciente"}
                </button>
              </div>
            )}

            {existingReports.length > 0 && (
              <div>
                <p className="mb-2 mt-2 text-sm font-bold text-brand-700">Relatórios anteriores</p>
                <div className="flex flex-col gap-2">
                  {existingReports.map((r) => (
                    <a key={r.id} href={r.fileUrl} target="_blank" rel="noreferrer" className="card flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand-700">
                        {r.periodStart} a {r.periodEnd}
                      </span>
                      <span className="text-brand-400">{KIND_OPTIONS.find((k) => k.key === r.kind)?.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
