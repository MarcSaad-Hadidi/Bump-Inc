// The cadence is real, visible time. Playback speed affects the native gesture
// itself, while its completed pose rests until the next 3.8-second opportunity.
export const METHOD_GESTURE_PERIOD=3.8;

export function advanceMethodGesture(state,delta,playbackRate,visible,reduced){
 if(reduced)return{time:0,phase:'rest'};
 if(visible)state.elapsed+=delta;
 const phase=state.elapsed%METHOD_GESTURE_PERIOD,clipTime=phase*playbackRate;
 return clipTime<state.duration?{time:clipTime,phase:'gesture'}:{time:0,phase:'rest'};
}
