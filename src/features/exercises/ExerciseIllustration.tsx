import { useState } from 'react';
import type { ExerciseCatalogEntry } from '../../domain/exerciseCatalog';
import benchpressStart from '../../assets/exercises/repdb/bench-press-start.webp';
import benchpressPeak from '../../assets/exercises/repdb/bench-press-peak.webp';
import barbellrowStart from '../../assets/exercises/repdb/barbell-row-start.webp';
import barbellrowPeak from '../../assets/exercises/repdb/barbell-row-peak.webp';
import dumbbellshoulderpressStart from '../../assets/exercises/repdb/dumbbell-shoulder-press-start.webp';
import dumbbellshoulderpressPeak from '../../assets/exercises/repdb/dumbbell-shoulder-press-peak.webp';
import latpulldownStart from '../../assets/exercises/repdb/lat-pulldown-start.webp';
import latpulldownPeak from '../../assets/exercises/repdb/lat-pulldown-peak.webp';
import lateralraiseStart from '../../assets/exercises/repdb/lateral-raise-start.webp';
import lateralraisePeak from '../../assets/exercises/repdb/lateral-raise-peak.webp';
import inclinedbpressStart from '../../assets/exercises/repdb/incline-db-press-start.webp';
import inclinedbpressPeak from '../../assets/exercises/repdb/incline-db-press-peak.webp';
import seatedcablerowStart from '../../assets/exercises/repdb/seated-cable-row-start.webp';
import seatedcablerowPeak from '../../assets/exercises/repdb/seated-cable-row-peak.webp';
import cableflyStart from '../../assets/exercises/repdb/cable-fly-start.webp';
import cableflyPeak from '../../assets/exercises/repdb/cable-fly-peak.webp';
import singlearmdbrowStart from '../../assets/exercises/repdb/single-arm-db-row-start.webp';
import singlearmdbrowPeak from '../../assets/exercises/repdb/single-arm-db-row-peak.webp';
import barbellcurlStart from '../../assets/exercises/repdb/barbell-curl-start.webp';
import barbellcurlPeak from '../../assets/exercises/repdb/barbell-curl-peak.webp';
import legpressStart from '../../assets/exercises/repdb/leg-press-start.webp';
import legpressPeak from '../../assets/exercises/repdb/leg-press-peak.webp';
import romaniandeadliftStart from '../../assets/exercises/repdb/romanian-deadlift-start.webp';
import romaniandeadliftPeak from '../../assets/exercises/repdb/romanian-deadlift-peak.webp';
import legextensionStart from '../../assets/exercises/repdb/leg-extension-start.webp';
import legextensionPeak from '../../assets/exercises/repdb/leg-extension-peak.webp';
import legcurlStart from '../../assets/exercises/repdb/leg-curl-start.webp';
import legcurlPeak from '../../assets/exercises/repdb/leg-curl-peak.webp';
import standingcalfraiseStart from '../../assets/exercises/repdb/standing-calf-raise-start.webp';
import standingcalfraisePeak from '../../assets/exercises/repdb/standing-calf-raise-peak.webp';
import hacksquatStart from '../../assets/exercises/repdb/hack-squat-start.webp';
import hacksquatPeak from '../../assets/exercises/repdb/hack-squat-peak.webp';
import hipthrustStart from '../../assets/exercises/repdb/hip-thrust-start.webp';
import hipthrustPeak from '../../assets/exercises/repdb/hip-thrust-peak.webp';
import seatedlegcurlStart from '../../assets/exercises/repdb/seated-leg-curl-start.webp';
import seatedlegcurlPeak from '../../assets/exercises/repdb/seated-leg-curl-peak.webp';
import smithmachinereverselungeStart from '../../assets/exercises/repdb/smith-machine-reverse-lunge-start.webp';
import smithmachinereverselungePeak from '../../assets/exercises/repdb/smith-machine-reverse-lunge-peak.webp';
import seatedcalfraiseStart from '../../assets/exercises/repdb/seated-calf-raise-start.webp';
import seatedcalfraisePeak from '../../assets/exercises/repdb/seated-calf-raise-peak.webp';
import dbbenchpressStart from '../../assets/exercises/repdb/db-bench-press-start.webp';
import dbbenchpressPeak from '../../assets/exercises/repdb/db-bench-press-peak.webp';
import chestsupporteddbrowStart from '../../assets/exercises/repdb/chest-supported-db-row-start.webp';
import chestsupporteddbrowPeak from '../../assets/exercises/repdb/chest-supported-db-row-peak.webp';
import cablelateralraiseStart from '../../assets/exercises/repdb/cable-lateral-raise-start.webp';
import cablelateralraisePeak from '../../assets/exercises/repdb/cable-lateral-raise-peak.webp';
import dumbbellromaniandeadliftStart from '../../assets/exercises/repdb/dumbbell-romanian-deadlift-start.webp';
import dumbbellromaniandeadliftPeak from '../../assets/exercises/repdb/dumbbell-romanian-deadlift-peak.webp';
import bodyweightreverselungeStart from '../../assets/exercises/repdb/bodyweight-reverse-lunge-start.webp';
import bodyweightreverselungePeak from '../../assets/exercises/repdb/bodyweight-reverse-lunge-peak.webp';
import chestpressmachineStart from '../../assets/exercises/repdb/chest-press-machine-start.webp';
import chestpressmachinePeak from '../../assets/exercises/repdb/chest-press-machine-peak.webp';

const assets: Record<string, string> = {
  'bench-press-start': benchpressStart, 'bench-press-peak': benchpressPeak,
  'barbell-row-start': barbellrowStart, 'barbell-row-peak': barbellrowPeak,
  'dumbbell-shoulder-press-start': dumbbellshoulderpressStart, 'dumbbell-shoulder-press-peak': dumbbellshoulderpressPeak,
  'lat-pulldown-start': latpulldownStart, 'lat-pulldown-peak': latpulldownPeak,
  'lateral-raise-start': lateralraiseStart, 'lateral-raise-peak': lateralraisePeak,
  'incline-db-press-start': inclinedbpressStart, 'incline-db-press-peak': inclinedbpressPeak,
  'seated-cable-row-start': seatedcablerowStart, 'seated-cable-row-peak': seatedcablerowPeak,
  'cable-fly-start': cableflyStart, 'cable-fly-peak': cableflyPeak,
  'single-arm-db-row-start': singlearmdbrowStart, 'single-arm-db-row-peak': singlearmdbrowPeak,
  'barbell-curl-start': barbellcurlStart, 'barbell-curl-peak': barbellcurlPeak,
  'leg-press-start': legpressStart, 'leg-press-peak': legpressPeak,
  'romanian-deadlift-start': romaniandeadliftStart, 'romanian-deadlift-peak': romaniandeadliftPeak,
  'leg-extension-start': legextensionStart, 'leg-extension-peak': legextensionPeak,
  'leg-curl-start': legcurlStart, 'leg-curl-peak': legcurlPeak,
  'standing-calf-raise-start': standingcalfraiseStart, 'standing-calf-raise-peak': standingcalfraisePeak,
  'hack-squat-start': hacksquatStart, 'hack-squat-peak': hacksquatPeak,
  'hip-thrust-start': hipthrustStart, 'hip-thrust-peak': hipthrustPeak,
  'seated-leg-curl-start': seatedlegcurlStart, 'seated-leg-curl-peak': seatedlegcurlPeak,
  'smith-machine-reverse-lunge-start': smithmachinereverselungeStart, 'smith-machine-reverse-lunge-peak': smithmachinereverselungePeak,
  'seated-calf-raise-start': seatedcalfraiseStart, 'seated-calf-raise-peak': seatedcalfraisePeak,
  'db-bench-press-start': dbbenchpressStart, 'db-bench-press-peak': dbbenchpressPeak,
  'chest-supported-db-row-start': chestsupporteddbrowStart, 'chest-supported-db-row-peak': chestsupporteddbrowPeak,
  'cable-lateral-raise-start': cablelateralraiseStart, 'cable-lateral-raise-peak': cablelateralraisePeak,
  'dumbbell-romanian-deadlift-start': dumbbellromaniandeadliftStart, 'dumbbell-romanian-deadlift-peak': dumbbellromaniandeadliftPeak,
  'bodyweight-reverse-lunge-start': bodyweightreverselungeStart, 'bodyweight-reverse-lunge-peak': bodyweightreverselungePeak,
  'chest-press-machine-start': chestpressmachineStart, 'chest-press-machine-peak': chestpressmachinePeak,
};
export function exerciseImageUrl(id: string, pose: 'start' | 'peak' = 'start'): string | undefined { return assets[`${id}-${pose}`]; }

export function ExerciseIllustration({ exercise, className = "", paired = false }: { exercise?: ExerciseCatalogEntry; className?: string; paired?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!exercise || failed || !exerciseImageUrl(exercise.imageId)) return <div className={`exercise-illustration exercise-illustration-fallback ${className}`} role="img" aria-label={`Ilustração indisponível: ${exercise?.name ?? "exercício personalizado"}`}><span>ILUSTRAÇÃO INDISPONÍVEL</span></div>;
  const start = exerciseImageUrl(exercise.imageId, "start"); const peak = paired ? exerciseImageUrl(exercise.imageId, "peak") : undefined;
  return <div className={`exercise-illustration ${paired ? "paired" : ""} ${className}`}><img src={start} alt={`${exercise.name}: posição inicial`} loading="lazy" width="512" height="512" onError={() => setFailed(true)} />{peak && <img src={peak} alt={`${exercise.name}: posição de esforço`} loading="lazy" width="512" height="512" onError={() => setFailed(true)} />}</div>;
}
