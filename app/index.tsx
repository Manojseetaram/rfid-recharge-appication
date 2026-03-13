import { useEffect, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function AppEntry() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await SecureStore.getItemAsync("auth_token");
    const isLoggedIn = await SecureStore.getItemAsync("is_logged_in");

    if (token && isLoggedIn === "true") {
      setLogged(true);
    } else {
      setLogged(false);
    }

    setChecking(false);
  };

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#F2CB07" />
      </View>
    );
  }

  if (!logged) return <Redirect href="/(auth)/login" />;

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "#0F0A2E",
    alignItems: "center",
    justifyContent: "center",
  },
});