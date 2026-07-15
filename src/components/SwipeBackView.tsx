import { useCallback } from 'react';
import { View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import type { ReactNode } from 'react';

type Props = {
  onBack: () => void;
  children: ReactNode;
};

export function SwipeBackView({ onBack, children }: Props) {
  const onHandlerStateChange = useCallback(
    ({ nativeEvent }: PanGestureHandlerStateChangeEvent) => {
      if (
        nativeEvent.state === State.END &&
        nativeEvent.translationX > 80 &&
        nativeEvent.velocityX > 300
      ) {
        onBack();
      }
    },
    [onBack]
  );

  return (
    <PanGestureHandler
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={20}
      failOffsetY={[-20, 20]}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </PanGestureHandler>
  );
}
