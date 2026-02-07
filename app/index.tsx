import { Redirect } from 'expo-router';

export default function AppEntry() {
  const isLoggedIn = false; // later from SecureStore / AsyncStorage

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
