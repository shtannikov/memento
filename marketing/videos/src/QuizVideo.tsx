import {Audio} from '@remotion/media';
import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ANSWER_SPEECH_FRAME, FRAMES_PER_ITEM, type EpisodeItem, type QuizVideoProps} from './manifest';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const RESPONSE_CENTER_Y = 1480;
const TIMER_SIZE = 300;
const ANSWER_BLOCK_HEIGHT = 180;

const Scene: React.FC<{item: EpisodeItem; index: number; total: number; languageId: string; seriesLabel: string; questionText: string; episodeId: string}> = ({item, index, total, languageId, seriesLabel, questionText, episodeId}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const answer = frame >= 141;
  const digit = frame < 81 ? 3 : frame < 111 ? 2 : 1;
  const progress = interpolate(frame, [51, 141], [0, 360], clamp);
  const pop = spring({frame: frame - 141, fps, config: {damping: 12, stiffness: 180, mass: 0.65}});
  const imageScale = interpolate(frame, [0, 12], [0.88, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const generatedBase = `generated/${languageId}/${episodeId}`;

  return (
    <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', color: '#17212b', background: `radial-gradient(circle at 10% 8%, white 0, transparent 30%), radial-gradient(circle at 100% 100%, ${item.accent}28 0, transparent 42%), ${item.pale}`}}>
      <div style={{position: 'absolute', top: 120, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontSize: 30, fontWeight: 800, letterSpacing: 5, color: item.accent}}>{seriesLabel}</div>
        <div style={{fontSize: 30, fontWeight: 800, padding: '16px 24px', borderRadius: 999, background: 'rgba(255,255,255,.72)'}}>{index + 1} / {total}</div>
      </div>
      <div style={{position: 'absolute', top: 210, left: 80, right: 80, textAlign: 'center', fontSize: 88, lineHeight: 1.05, letterSpacing: -3, fontWeight: 900}}>{questionText}</div>
      <div style={{position: 'absolute', top: 455, left: 100, right: 100, height: 760, borderRadius: 68, border: `8px solid ${item.accent}22`, background: '#fff', boxShadow: '0 34px 90px rgba(24,34,45,.14)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'}}>
        <Img src={staticFile(`${generatedBase}/images/${item.slug}.png`)} style={{width: '100%', height: '100%', objectFit: 'contain', scale: imageScale}} />
      </div>
      {!answer ? <div style={{position: 'absolute', top: RESPONSE_CENTER_Y - TIMER_SIZE / 2, left: 0, right: 0, textAlign: 'center'}}>
        <div style={{margin: '0 auto', width: TIMER_SIZE, height: TIMER_SIZE, borderRadius: '50%', background: `conic-gradient(${item.accent} ${progress}deg, ${item.accent}24 0)`, display: 'grid', placeItems: 'center'}}>
          <div style={{width: 250, height: 250, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 146, fontWeight: 900, color: item.accent}}>{digit}</div>
        </div>
      </div> : <div style={{position: 'absolute', top: RESPONSE_CENTER_Y - ANSWER_BLOCK_HEIGHT / 2, height: ANSWER_BLOCK_HEIGHT, left: 70, right: 70, textAlign: 'center', opacity: interpolate(frame, [141, 149], [0, 1], clamp), scale: interpolate(pop, [0, 1], [0.75, 1], clamp)}}>
        <div style={{fontSize: item.term.length > 9 ? 106 : 128, lineHeight: 1.05, fontWeight: 950, letterSpacing: -4, color: item.accent}}>{item.term}</div>
        <div style={{margin: '30px auto 0', width: 170, height: 12, borderRadius: 99, background: item.accent}} />
      </div>}
      <Audio src={staticFile(`languages/${languageId}/question.wav`)} from={8} volume={1} />
      {[51, 81, 111].map((at) => <Audio key={at} src={staticFile('core/sfx/tick.wav')} from={at} volume={0.8} />)}
      <Audio src={staticFile('core/sfx/ding.wav')} from={141} volume={0.7} />
      <Audio src={staticFile(`${generatedBase}/audio/${item.slug}.wav`)} from={ANSWER_SPEECH_FRAME} volume={1.15} />
    </AbsoluteFill>
  );
};

export const QuizVideo: React.FC<QuizVideoProps> = ({language, episode}) => (
  <AbsoluteFill>{episode.items.map((item, i) => <Sequence key={item.slug} from={i * FRAMES_PER_ITEM} durationInFrames={FRAMES_PER_ITEM} name={item.term}><Scene item={item} index={i} total={episode.items.length} languageId={language.id} seriesLabel={language.seriesLabel} questionText={language.questionText} episodeId={episode.id} /></Sequence>)}</AbsoluteFill>
);
