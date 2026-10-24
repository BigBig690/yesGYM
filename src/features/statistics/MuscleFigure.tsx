import { useState } from 'react';
import {
  getAnatomyForView,
  getAnatomyViewBox,
  getRegionAnatomy,
  getRegionsForView,
  type MuscleView,
} from './anatomyMuscleMap';

export { MUSCLE_MAP_REGIONS, UNMAPPED_CATALOG_MUSCLES } from './anatomyMuscleMap';
export type { MuscleRegion, MuscleView } from './anatomyMuscleMap';

type MuscleFigureProps = {
  title: string;
  view: MuscleView;
  selectedMuscle: string;
  recordedMuscles: ReadonlySet<string>;
  onSelect: (muscle: string) => void;
};

/** Interactive React rendering of Body Muscles' local anatomical SVG paths. */
export function MuscleFigure({ title, view, selectedMuscle, recordedMuscles, onSelect }: MuscleFigureProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const anatomy = getAnatomyForView(view);
  const regions = getRegionsForView(view);

  return <figure className={'muscle-figure muscle-figure-' + view}>
    <figcaption><strong>{title}</strong><span>Anatomia interativa · Body Muscles 1.0.0</span></figcaption>
    <svg viewBox={getAnatomyViewBox(view)} role="group" aria-label={title + ' com grupos musculares selecionáveis'} focusable="false">
      <g className="anatomy-base" aria-hidden="true">
        {anatomy.map((part) => <path key={part.id} d={part.path} className="anatomy-base-path" />)}
      </g>
      {regions.map((region) => {
        const parts = getRegionAnatomy(region, view);
        const selected = region.id === selectedMuscle || region.muscles.includes(selectedMuscle);
        const hasRecords = region.muscles.some((muscle) => recordedMuscles.has(muscle));
        const hovered = hoveredId === region.id;
        const noCatalogMapping = region.muscles.length === 0;
        const accessibleName = 'Selecionar ' + region.label + (noCatalogMapping ? ' · sem associação no catálogo de exercícios' : '');
        const selectRegion = () => onSelect(region.muscles[0] ?? region.id);

        return <g
          key={region.id}
          className={'anatomy-region' + (selected ? ' selected' : '') + (hasRecords ? ' has-records' : '') + (hovered ? ' hovered' : '') + (noCatalogMapping ? ' untracked' : '')}
          data-region-id={region.id}
          role="button"
          tabIndex={0}
          aria-label={accessibleName}
          aria-pressed={selected}
          onPointerEnter={() => setHoveredId(region.id)}
          onPointerLeave={() => setHoveredId(null)}
          onFocus={() => setHoveredId(region.id)}
          onBlur={() => setHoveredId(null)}
          onClick={selectRegion}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectRegion();
            }
          }}
        >
          <title>{region.label}{hasRecords ? ' · possui séries concluídas no período' : noCatalogMapping ? ' · sem dados de exercício associados' : ' · sem séries concluídas no período'}</title>
          {parts.map((part) => <path key={part.id} className="anatomy-region-path" data-anatomy-id={part.id} d={part.path} fillRule="evenodd" />)}
        </g>;
      })}
    </svg>
  </figure>;
}
