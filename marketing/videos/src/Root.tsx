import React from 'react';
import {Composition} from 'remotion';
import defaultEpisode from '../episodes/cz/cafe.json';
import defaultLanguage from '../languages/cz/config.json';
import {QuizVideo} from './QuizVideo';
import {VIDEO_DURATION_IN_FRAMES, VIDEO_FPS, VIDEO_HEIGHT, VIDEO_WIDTH, resolveQuizVideoProps} from './manifest';

const defaultProps = resolveQuizVideoProps(defaultLanguage, defaultEpisode);

export const Root: React.FC = () => (
  <Composition id="VocabularyQuiz" component={QuizVideo} defaultProps={defaultProps} durationInFrames={VIDEO_DURATION_IN_FRAMES} fps={VIDEO_FPS} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} />
);
