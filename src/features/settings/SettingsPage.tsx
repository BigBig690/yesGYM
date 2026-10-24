import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { CSSProperties } from 'react';
import type { AppData, Preferences } from '../../domain/models';
import { getCompanionNarrative } from '../../domain/narrative';
import type { SaveResult } from '../../storage/appStorage';
import { BackupSection } from './BackupSection';
import { RoutineExerciseManager } from './RoutineExerciseManager';
import { getCompanionCharacter } from '../../domain/companionCatalog';

const accents = [
  { id: 'purple-eclipse', label: 'Purple Eclipse', color: '#ad8aff' },
  { id: 'crimson', label: 'Crimson', color: '#fb657d' },
  { id: 'azure', label: 'Azure', color: '#56a9ff' },
  { id: 'emerald', label: 'Emerald', color: '#55d6a0' },
  { id: 'rose', label: 'Rose', color: '#fa86c6' },
  { id: 'amber', label: 'Amber', color: '#f1b765' },
] as const;
const personalities = [
  { id: 'strategist', label: 'Estrategista', detail: 'Analítica e tranquila' },
  { id: 'enthusiast', label: 'Entusiasmada', detail: 'Energética e acolhedora' },
  { id: 'friendly-rival', label: 'Rival amigável', detail: 'Competitiva com respeito' },
] as const;

type SettingsPageProps = {
  data: AppData;
  onSave: (next: AppData) => SaveResult;
  onPreview: (preferences: Preferences | null) => void;
  onRestore: (data: AppData) => SaveResult;
  restoreNotice?: string | null;
  focusRoutineId?: string | null;
};

export function SettingsPage({ data, onSave, onPreview, onRestore, restoreNotice, focusRoutineId }: SettingsPageProps) {
  const [name, setName] = useState(data.profile.displayName ?? '');
  const [showName, setShowName] = useState(data.profile.showDisplayName ?? true);
  const canonicalCompanionName = getCompanionCharacter(data.companion.characterId).name;
  const [personality, setPersonality] = useState(data.companion.personality ?? 'strategist');
  const [personalityName, setPersonalityName] = useState(data.companion.personalityName ?? '');
  const [preferences, setPreferences] = useState<Preferences>(withDefaults(data.preferences));
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => () => onPreview(null), [onPreview]);
  useEffect(() => {
    setName(data.profile.displayName ?? '');
    setShowName(data.profile.showDisplayName ?? true);
    setPersonality(data.companion.personality ?? 'strategist');
    setPersonalityName(data.companion.personalityName ?? '');
    setPreferences(withDefaults(data.preferences));
  }, [data]);

  const updatePreferences = (next: Preferences) => {
    setPreferences(next);
    onPreview(next);
    setFeedback(null);
  };
  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: AppData = {
      ...data,
      profile: { ...data.profile, displayName: name.trim() || undefined, showDisplayName: showName },
      companion: { ...data.companion, displayName: canonicalCompanionName, personality, personalityName: personalityName.trim() || undefined },
      preferences: { ...preferences },
    };
    const result = onSave(next);
    if (result.ok) {
      onPreview(null);
      setFeedback({ kind: 'success', text: 'Preferências salvas neste dispositivo.' });
    } else {
      onPreview(null);
      setFeedback({ kind: 'error', text: `Não foi possível salvar: ${result.message}` });
    }
  };
  const resetPreferences = () => {
    const next = defaultPreferences(data.preferences.weightUnit);
    const result = onSave({ ...data, preferences: next });
    onPreview(null);
    setConfirmReset(false);
    if (result.ok) {
      setPreferences(next);
      setFeedback({ kind: 'success', text: 'Preferências visuais e narrativas restauradas. Rotinas e histórico foram mantidos.' });
    } else setFeedback({ kind: 'error', text: `Não foi possível restaurar: ${result.message}` });
  };

  return <div className="settings-page">
    <header className="settings-heading"><p className="eyebrow">SISTEMA · AJUSTES DO PROTAGONISTA</p><h1>Configurações</h1><p>Personalize a jornada. As mudanças só são confirmadas quando puderem ser salvas.</p></header>
    {feedback && <div className={`settings-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</div>}
    <form onSubmit={handleSave}>
      <section className="settings-panel" aria-labelledby="profile-settings-title"><div className="settings-section-title"><span className="settings-index">01</span><div><h2 id="profile-settings-title">Perfil do protagonista</h2><p>Como o sistema se dirige a você.</p></div></div>
        <div className="settings-fields"><div className="setting-field"><label htmlFor="protagonist-name">Nome ou apelido</label><input id="protagonist-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="Protagonista" /></div>
          <label className="setting-toggle"><input type="checkbox" checked={showName} onChange={(event) => setShowName(event.target.checked)} /><span><strong>Exibir o nome no Dashboard</strong><small>O apelido fica guardado e pode voltar a ser exibido depois.</small></span></label>
        </div>
      </section>
      <section className="settings-panel" aria-labelledby="appearance-settings-title"><div className="settings-section-title"><span className="settings-index">02</span><div><h2 id="appearance-settings-title">Aparência</h2><p>Uma identidade escura com cor de energia escolhida por você.</p></div></div>
        <div className="settings-fields"><fieldset className="setting-fieldset"><legend>Cor de destaque</legend><div className="accent-options">{accents.map((accent) => <label className="accent-option" key={accent.id}><input type="radio" name="accent" value={accent.id} checked={preferences.accentColor === accent.id} onChange={() => updatePreferences({ ...preferences, accentColor: accent.id })} /><span className="accent-swatch" style={{ '--swatch': accent.color } as CSSProperties} /><span>{accent.label}</span></label>)}</div></fieldset>
          <div className="setting-field"><span className="setting-label">Tema</span><p className="setting-static"><span className="theme-indicator" /> Escuro · identidade padrão do Training Arc</p></div>
          <label className="setting-toggle"><input type="checkbox" checked={!preferences.reduceMotion} onChange={(event) => updatePreferences({ ...preferences, reduceMotion: !event.target.checked })} /><span><strong>Usar efeitos de movimento</strong><small>O sistema também respeita a redução de movimento do dispositivo.</small></span></label>
        </div>
      </section>
      <section className="settings-panel" aria-labelledby="narrative-settings-title"><div className="settings-section-title"><span className="settings-index">03</span><div><h2 id="narrative-settings-title">Narrativa</h2><p>Escolha o tom das mensagens que acompanham sua jornada.</p></div></div>
        <div className="settings-fields"><div className="setting-field"><label htmlFor="narrative-style">Estilo narrativo</label><select id="narrative-style" value={normalizeStyle(preferences.narrativeStyle)} onChange={(event) => updatePreferences({ ...preferences, narrativeStyle: event.target.value as Preferences['narrativeStyle'] })}><option value="epic">Épico</option><option value="playful">Descontraído</option><option value="calm">Tranquilo</option></select></div><p className="setting-preview">Prévia: “{previewLine(preferences)}”</p></div>
      </section>
      <section className="settings-panel companion-settings" aria-labelledby="companion-settings-title"><div className="settings-section-title"><span className="settings-index">04</span><div><h2 id="companion-settings-title">Companheira</h2><p>Defina a presença que acompanha seus capítulos.</p></div></div>
        <div className="companion-preview-card"><div className="mini-companion-orb" aria-hidden="true"><span>✦</span></div><div><small>PRÉVIA DA COMPANHEIRA</small><strong>{canonicalCompanionName}</strong><span>{personalities.find((item) => item.id === personality)?.label ?? 'Estrategista'}</span><p>“{getCompanionNarrative(personality)}”</p></div></div>
        <div className="settings-fields"><p className="setting-static">Personagem: <strong>{canonicalCompanionName}</strong> · nome canônico do elenco</p>
          <fieldset className="setting-fieldset"><legend>Personalidade</legend><div className="personality-options">{personalities.map((item) => <label className="personality-option" key={item.id}><input type="radio" name="personality" value={item.id} checked={personality === item.id} onChange={() => setPersonality(item.id)} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></label>)}</div></fieldset>
          <div className="setting-field"><label htmlFor="personality-name">Nome personalizado para o estilo <span>(opcional)</span></label><input id="personality-name" value={personalityName} maxLength={32} onChange={(event) => setPersonalityName(event.target.value)} placeholder={personalities.find((item) => item.id === personality)?.label ?? 'Estrategista'} /></div>
        </div>
      </section>
      <div className="settings-actions"><button className="primary-action" type="submit">Salvar configurações <span aria-hidden="true">→</span></button><button className="secondary-action" type="button" onClick={() => setConfirmReset(true)}>Restaurar preferências visuais e narrativas</button></div>
    </form>
    <RoutineExerciseManager data={data} onSave={onSave} focusRoutineId={focusRoutineId} />
    <BackupSection data={data} onRestore={onRestore} notice={restoreNotice} />
    {confirmReset && <div className="confirm-backdrop"><section className="confirm-dialog settings-confirm" role="alertdialog" aria-modal="true" aria-labelledby="reset-settings-title" aria-describedby="reset-settings-description"><div className="confirm-mark">↺</div><h2 id="reset-settings-title">Restaurar preferências?</h2><p id="reset-settings-description">A cor, o estilo narrativo e o movimento voltarão ao padrão. Nome, companheira, rotinas e histórico serão mantidos.</p><div className="confirm-actions"><button className="secondary-action" autoFocus type="button" onClick={() => setConfirmReset(false)}>Cancelar</button><button className="danger-action" type="button" onClick={resetPreferences}>Restaurar preferências</button></div></section></div>}
  </div>;
}

export function defaultPreferences(weightUnit: Preferences['weightUnit'] = 'kg'): Preferences {
  return { weightUnit, colorTheme: 'dark', accentColor: 'purple-eclipse', narrativeStyle: 'epic', reduceMotion: false };
}

function withDefaults(preferences: Preferences): Preferences {
  return { ...defaultPreferences(preferences.weightUnit), ...preferences,
    colorTheme: 'dark', accentColor: normalizeAccent(preferences.accentColor),
    narrativeStyle: normalizeStyle(preferences.narrativeStyle), reduceMotion: preferences.reduceMotion ?? false };
}

function normalizeAccent(accent: Preferences['accentColor']): NonNullable<Preferences['accentColor']> {
  if (accent === 'violet') return 'purple-eclipse';
  if (accent === 'electric-blue') return 'azure';
  if (accent === 'teal') return 'emerald';
  return accent ?? 'purple-eclipse';
}

function normalizeStyle(style: Preferences['narrativeStyle']): 'epic' | 'playful' | 'calm' {
  if (style === 'playful' || style === 'calm' || style === 'direct') return 'calm';
  return 'epic';
}

function previewLine(preferences: Preferences): string {
  const style = normalizeStyle(preferences.narrativeStyle);
  return style === 'playful' ? 'A aventura de hoje aceita um passo de cada vez.'
    : style === 'calm' ? 'Um começo tranquilo também é um começo.'
      : 'O próximo arco começa com a decisão de aparecer.';
}
