import { TopBar } from "@/components/common/TopBar";

export function PrivacyPolicyPage() {
  return (
    <div className="app-container">
      <TopBar title="Política de Privacidade" back />
      <div className="flex flex-col gap-3 px-4 pb-8 text-sm leading-relaxed text-brand-700">
        <p>
          O ROTA foi criado para apoiar o acompanhamento da rotina entre profissionais de saúde e pacientes,
          incluindo pessoas neurodivergentes e com condições como transtorno de personalidade borderline. Levamos a
          privacidade dos seus dados a sério e seguimos os princípios da Lei Geral de Proteção de Dados (LGPD).
        </p>
        <h2 className="font-bold text-brand-900">Quais dados coletamos</h2>
        <p>
          Nome, e-mail, dados de rotina (atividades, horários), registros de conclusão de atividades, sentimentos
          relatados, comentários, pontuação e recompensas, e informações técnicas necessárias para notificações
          (token do dispositivo).
        </p>
        <h2 className="font-bold text-brand-900">Como usamos seus dados</h2>
        <p>
          Os dados são usados exclusivamente para exibir sua rotina, gerar lembretes, calcular recompensas e permitir
          que a profissional responsável acompanhe sua evolução. Não vendemos nem compartilhamos seus dados com
          terceiros para fins comerciais.
        </p>
        <h2 className="font-bold text-brand-900">Quem acessa seus dados</h2>
        <p>
          Apenas você e a(s) profissional(is) formalmente vinculada(s) à sua conta têm acesso aos seus dados. Um
          paciente nunca tem acesso aos dados de outro paciente.
        </p>
        <h2 className="font-bold text-brand-900">Seus direitos</h2>
        <p>
          Você pode, a qualquer momento, solicitar a exportação de todos os seus dados ou a exclusão da sua conta,
          disponíveis na tela de Perfil.
        </p>
        <h2 className="font-bold text-brand-900">Importante</h2>
        <p>
          O ROTA não realiza diagnósticos automáticos. As informações apresentadas à profissional são apenas dados e
          padrões para apoiar sua própria avaliação clínica.
        </p>
      </div>
    </div>
  );
}
