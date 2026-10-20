import React from "react";
import { Composition } from "remotion";
import { ChairFillExplainer } from "./ChairFillExplainer";
import { DURATION, FPS } from "./timing";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ChairFillExplainer"
    component={ChairFillExplainer}
    durationInFrames={DURATION}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
