import { BACK_MUSCLES, FRONT_MUSCLES, type MuscleDef } from 'body-muscles';

export type MuscleView = 'front' | 'back';

export type MuscleRegion = {
  id: string;
  label: string;
  /** Exact exercise-catalog labels represented by the drawn anatomy. */
  muscles: readonly string[];
  /** IDs from body-muscles v1.0.0; each path is a real anatomical region. */
  anatomyIds: readonly string[];
};

const groups: Readonly<Record<MuscleView, readonly MuscleRegion[]>> = {
  front: [
    { id: 'deltoide-anterior', label: 'Deltoide anterior', muscles: ['Deltoide anterior'], anatomyIds: ['shoulder-front-left', 'shoulder-front-right'] },
    { id: 'deltoide-lateral', label: 'Deltoide lateral', muscles: ['Deltoide lateral'], anatomyIds: ['shoulder-side-left', 'shoulder-side-right'] },
    { id: 'peitoral-maior', label: 'Peitoral maior', muscles: ['Peitoral maior'], anatomyIds: ['chest-upper-left', 'chest-lower-left', 'chest-upper-right', 'chest-lower-right'] },
    { id: 'biceps-braquial', label: 'Bíceps braquial', muscles: ['Bíceps braquial', 'Bíceps'], anatomyIds: ['biceps-left', 'biceps-right'] },
    { id: 'antebraco-anterior', label: 'Antebraço · vista anterior', muscles: [], anatomyIds: ['forearm-left', 'forearm-right'] },
    { id: 'abdomen', label: 'Abdômen', muscles: [], anatomyIds: ['abs-upper-left', 'abs-upper-right', 'abs-lower-left', 'abs-lower-right'] },
    { id: 'obliquos', label: 'Oblíquos externos', muscles: [], anatomyIds: ['obliques-left', 'obliques-right'] },
    { id: 'serrato-anterior', label: 'Serrátil anterior', muscles: [], anatomyIds: ['serratus-anterior-left', 'serratus-anterior-right'] },
    { id: 'flexores-quadril', label: 'Flexores do quadril', muscles: [], anatomyIds: ['hip-flexor-left', 'hip-flexor-right'] },
    { id: 'quadriceps', label: 'Quadríceps', muscles: ['Quadríceps'], anatomyIds: ['quads-left', 'quads-right'] },
    { id: 'adutores', label: 'Adutores', muscles: [], anatomyIds: ['adductors-left', 'adductors-right'] },
    { id: 'tibial-anterior', label: 'Tibial anterior', muscles: [], anatomyIds: ['tibialis-anterior-left', 'tibialis-anterior-right'] },
  ],
  back: [
    { id: 'deltoide-posterior', label: 'Deltoide posterior', muscles: ['Deltoide posterior'], anatomyIds: ['deltoid-rear-left', 'deltoid-rear-right'] },
    { id: 'trapezio', label: 'Trapézio', muscles: ['Trapézio'], anatomyIds: ['traps-upper-left', 'traps-mid-left', 'traps-lower-left', 'traps-upper-right', 'traps-mid-right', 'traps-lower-right'] },
    { id: 'latissimo-dorso', label: 'Latíssimo do dorso', muscles: ['Latíssimo do dorso'], anatomyIds: ['lats-upper-left', 'lats-mid-left', 'lats-lower-left', 'lats-upper-right', 'lats-mid-right', 'lats-lower-right'] },
    { id: 'triceps', label: 'Tríceps', muscles: ['Tríceps'], anatomyIds: ['triceps-long-left', 'triceps-lateral-left', 'triceps-long-right', 'triceps-lateral-right'] },
    { id: 'flexores-antebraco-posterior', label: 'Antebraços · vista posterior', muscles: ['Flexores do antebraço'], anatomyIds: ['forearm-flexors-left', 'forearm-flexors-right'] },
    { id: 'eretores-coluna', label: 'Eretores da coluna', muscles: ['Eretores da coluna'], anatomyIds: ['lower-back-erectors-left', 'lower-back-erectors-right'] },
    { id: 'quadrado-lombar', label: 'Quadrado lombar', muscles: [], anatomyIds: ['lower-back-ql-left', 'lower-back-ql-right'] },
    { id: 'gluteo-medio', label: 'Glúteo médio', muscles: ['Glúteo médio'], anatomyIds: ['gluteus-medius-left', 'gluteus-medius-right'] },
    { id: 'gluteo-maximo', label: 'Glúteo máximo', muscles: ['Glúteo máximo'], anatomyIds: ['gluteus-maximus-left', 'gluteus-maximus-right'] },
    { id: 'posteriores-coxa', label: 'Posteriores da coxa', muscles: ['Posteriores da coxa'], anatomyIds: ['hamstrings-medial-left', 'hamstrings-lateral-left', 'hamstrings-medial-right', 'hamstrings-lateral-right'] },
    { id: 'gastrocnemio', label: 'Gastrocnêmio', muscles: ['Gastrocnêmio'], anatomyIds: ['calves-gastroc-medial-left', 'calves-gastroc-lateral-left', 'calves-gastroc-medial-right', 'calves-gastroc-lateral-right'] },
    { id: 'soleo', label: 'Sóleo', muscles: ['Sóleo'], anatomyIds: ['calves-soleus-left', 'calves-soleus-right'] },
  ],
};

export const MUSCLE_MAP_REGIONS = groups;
export const UNMAPPED_CATALOG_MUSCLES = ['Braquial', 'Romboides'] as const;

export function getAnatomyForView(view: MuscleView): readonly MuscleDef[] {
  return view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
}

export function getRegionAnatomy(region: MuscleRegion, view: MuscleView): readonly MuscleDef[] {
  const available = new Map(getAnatomyForView(view).map((definition) => [definition.id, definition]));
  return region.anatomyIds.flatMap((id) => {
    const definition = available.get(id);
    return definition ? [definition] : [];
  });
}

export function getRegionsForView(view: MuscleView): readonly MuscleRegion[] {
  return groups[view];
}

export function getAnatomyViewBox(view: MuscleView): string {
  return view === 'front' ? '0 0 35 93' : '37 0 35 93';
}
