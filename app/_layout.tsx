import { Stack } from "expo-router";
import { HistoryProvider } from "./context/HistoryContext";

export default function RootLayout() {
  return (
    <HistoryProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </HistoryProvider>
  );
}
