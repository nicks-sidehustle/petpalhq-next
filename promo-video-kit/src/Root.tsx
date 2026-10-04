import React from 'react';
import {Composition, CalculateMetadataFunction} from 'remotion';
import {Promo, PromoProps} from './Promo';
import {totalFrames} from './timeline';
import sample from '../data/pet.json';

// Duration follows the item count and tempo, so `--props=data/my-video.json` works for any list.
const meta: CalculateMetadataFunction<PromoProps> = ({props}) => ({durationInFrames: totalFrames(props.items.length, props.bpm)});

export const Root: React.FC = () => (
  <Composition id="PetPalHQ" component={Promo} defaultProps={sample as PromoProps} calculateMetadata={meta} durationInFrames={600} fps={30} width={1080} height={1920} />
);
