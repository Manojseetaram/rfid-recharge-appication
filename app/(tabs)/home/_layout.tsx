import { Stack } from "expo-router";
import { Buffer } from "buffer";
global.Buffer = Buffer;
export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#38208C" }, 
      }}
    />
  );
}
