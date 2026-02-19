import { Redirect } from 'expo-router';

export default function AppEntry() {
  const isLoggedIn = false; 

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
