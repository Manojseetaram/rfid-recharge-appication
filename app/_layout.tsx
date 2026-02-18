import { Stack } from "expo-router";
import { HistoryProvider } from "./context/HistoryContext";


export default function RootLayout() {
  return (
    <HistoryProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#38208C" }, // 👈 add this
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </HistoryProvider>
  );
}
