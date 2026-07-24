import { TopBar } from "@/components/common/TopBar";

export function TermsPage() {
  return (
    <div className="app-container">
      <TopBar title="Termos de Uso" back />
      <div className="flex flex-col gap-3 px-4 pb-8 text-sm leading-relaxed text-brand-700">
        <p>Ao usar o ROTA, você concorda com os termos a seguir.</p>
        <h2 className="font-bold text-brand-900">Objetivo do sistema</h2>
        <p>
          O ROTA é uma ferramenta de apoio ao acompanhamento de rotina entre profissionais de saúde e pacientes. Ele
          não substitui consultas, avaliações ou tratamentos profissionais.
        </p>
        <h2 className="font-bold text-brand-900">Uso adequado</h2>
        <p>
          As informações registradas devem ser verdadeiras. A profissional é responsável pelas orientações e
          atividades cadastradas para cada paciente.
        </p>
        <h2 className="font-bold text-brand-900">Sem diagnóstico automático</h2>
        <p>
          O sistema apresenta dados e padrões de rotina para apoiar a avaliação da profissional, mas não realiza
          diagnósticos, prescrições ou qualquer forma de aconselhamento automatizado.
        </p>
        <h2 className="font-bold text-brand-900">Conta e acesso</h2>
        <p>
          Cada usuário é responsável por manter sua senha em sigilo. O acesso de pacientes é restrito aos próprios
          dados; a profissional acessa apenas pacientes formalmente vinculados à sua conta.
        </p>
        <h2 className="font-bold text-brand-900">Alterações</h2>
        <p>Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas dentro do aplicativo.</p>
      </div>
    </div>
  );
}
