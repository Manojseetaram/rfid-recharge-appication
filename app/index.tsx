import { Redirect } from 'expo-router';

export default function Index() {
  const isLoggedIn = false; // 🔁 later from secure storage

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
