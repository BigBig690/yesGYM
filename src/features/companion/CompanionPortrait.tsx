import { useState } from 'react';
import { resolveCompanionPortrait } from './portraitAssets';
import type { CompanionCharacter } from '../../domain/companionCatalog';

type PortraitMode = 'card' | 'detail' | 'dashboard' | 'stage' | 'compact';

type CompanionPortraitProps = {
  character: CompanionCharacter;
  displayName?: string;
  className?: string;
  mode: PortraitMode;
  eager?: boolean;
};

export function CompanionPortrait({ character, displayName = character.name, className = '', mode, eager = false }: CompanionPortraitProps) {
  const source = resolveCompanionPortrait(character.id);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const initials = displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toLocaleUpperCase('pt-BR');
  const classes = `companion-portrait-frame companion-portrait-${mode}${className ? ` ${className}` : ''}`;

  if (source && failedSource !== source) return <div className={`${classes} has-local-portrait`}>
    {mode === 'stage' && <div className="companion-stage-ring" aria-hidden="true" />}
    <img src={source} alt={`Retrato de ${character.name}, acompanhando ${displayName}`} width={240} height={300}
      loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSource(source)} />
  </div>;

  return <div className={`${classes} portrait-fallback`} role="img" aria-label={`Retrato não disponível para ${character.name}; nome exibido: ${displayName}`} data-character-id={character.id}>
    {mode === 'stage' && <div className="companion-stage-ring" aria-hidden="true" />}
    <span className="portrait-initials" aria-hidden="true">{initials || 'TA'}</span>
    {mode !== 'compact' && <small>ARTE INDISPONÍVEL · IDENTIDADE PRESERVADA</small>}
  </div>;
}
