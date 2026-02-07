import { Redirect } from 'expo-router';

export default function Index() {
  const isLoggedIn = false; // later from SecureStore / AsyncStorage

  return isLoggedIn
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/login" />;
}
