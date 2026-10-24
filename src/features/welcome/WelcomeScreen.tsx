import { BrandMark } from '../../components/BrandMark';

type WelcomeScreenProps = {
  ready: boolean;
  storageMessage: string | null;
};

export function WelcomeScreen({ ready, storageMessage }: WelcomeScreenProps) {
  return (
    <main className="welcome-shell">
      <section aria-labelledby="page-title" className="welcome-card">
        <BrandMark />
        <p className="eyebrow">SUA JORNADA COMEÇA AQUI</p>
        <h1 id="page-title">Training Arc <span>2.0</span></h1>
        <p className="intro">Um novo capítulo para acompanhar sua evolução, treino após treino.</p>
        <div aria-live="polite" className="status-line">
          <span aria-hidden="true" className={`status-dot ${ready ? 'is-ready' : ''}`} />
          {storageMessage ?? (ready ? 'Fundação local pronta.' : 'Preparando seus dados locais…')}
        </div>
        <p className="footnote">Progresso real. Um passo de cada vez.</p>
      </section>
    </main>
  );
}
