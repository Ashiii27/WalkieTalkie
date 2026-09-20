import { Stack } from 'expo-router';
import { ChannelProvider } from '../../hooks/ChannelContext';
import { colors } from '../../constants/theme';

export default function AppLayout() {
  return (
    <ChannelProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="radio" />
        <Stack.Screen name="index" />
        <Stack.Screen name="log" />
      </Stack>
    </ChannelProvider>
  );
}
