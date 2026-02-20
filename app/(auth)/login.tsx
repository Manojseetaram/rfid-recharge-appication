import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../(tabs)/home/customalert";
import { loginUser } from "../api/auth";
import * as SecureStore from "expo-secure-store";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [showContactAlert, setShowContactAlert] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating orb loops
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(orb1, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2, { toValue: 1, duration: 5500, useNativeDriver: true }),
        Animated.timing(orb2, { toValue: 0, duration: 5500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setShowAlert(true);
      return;
    }

    Animated.sequence([
      Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true, tension: 300 }),
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    setIsLoading(true);
    try {
      const result = await loginUser(email.trim(), password.trim());
      const token = result?.data?.token;
      if (!token) throw new Error("Token not received");

      await SecureStore.setItemAsync("auth_token", token);
      await SecureStore.setItemAsync("is_logged_in", "true");
      console.log("✅ Token stored:", token);
      router.replace("/(tabs)/home");
    } catch (error: any) {
      console.log("Login error:", error.message);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => setShowContactAlert(true);
  const handleCallSupport = () => {
    setShowContactAlert(false);
    const { Linking } = require("react-native");
    Linking.openURL("tel:7899957067");
  };

  const orb1Y = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const orb2Y = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Background layers (no LinearGradient) ── */}
      <View style={styles.bgBase} />
      <View style={styles.bgTopLayer} />
      <View style={styles.bgBottomLayer} />

      {/* Floating orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1Y }] }]} />
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2Y }] }]} />
      <View style={styles.orb3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.content}>

          {/* ── Logo section ── */}
          <Animated.View
            style={[styles.logoSection, {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }],
            }]}
          >
            {/* Outer glow ring */}
            <View style={styles.logoGlowRing}>
              {/* Gold border ring */}
              <View style={styles.logoRing}>
                {/* White circle — tight, no excess padding */}
                <View style={styles.logoInner}>
                  <Image
                    source={require("../../assets/images/Lorenta-1.png")}
                    style={styles.logo}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.brandName}>LORENTA</Text>
            <Text style={styles.brandTagline}>Smart Recharge System</Text>
          </Animated.View>

          {/* ── Form card ── */}
          <Animated.View
            style={[styles.formCard, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }]}
          >
            {/* Top highlight line */}
            <View style={styles.cardTopLine} />

            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue</Text>

            {/* Email */}
            <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
              <View style={styles.inputIconWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? "#F2CB07" : "rgba(255,255,255,0.35)"}
                />
              </View>
              <TextInput
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrapper, passwordFocused && styles.inputFocused]}>
              <View style={styles.inputIconWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? "#F2CB07" : "rgba(255,255,255,0.35)"}
                />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="rgba(255,255,255,0.35)"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotWrap}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                activeOpacity={0.88}
              >
                {/* Gold button — no LinearGradient, use solid + border trick */}
                <View style={styles.buttonInner}>
                  {isLoading ? (
                    <Text style={styles.buttonText}>Signing in...</Text>
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={20} color="#1A0E4F" />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>

          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={showAlert}
        type="error"
        title="Login Failed"
        message="Invalid email or password"
        onConfirm={() => setShowAlert(false)}
      />

      <CustomAlert
        visible={showContactAlert}
        type="confirm"
        title="Contact Support"
        message="Email: lorentatechnolgy@gmail.com&#10;Phone: 7899957067"
        onConfirm={handleCallSupport}
        onCancel={() => setShowContactAlert(false)}
        confirmText="Call Now"
        cancelText="Cancel"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },

  // ── Background (replaces LinearGradient) ──
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A0E4F",
  },
  bgTopLayer: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: height * 0.55,
    backgroundColor: "#2D1875",
    borderBottomLeftRadius: width,
    borderBottomRightRadius: width * 0.3,
    opacity: 0.7,
  },
  bgBottomLayer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: height * 0.35,
    backgroundColor: "#2A1570",
    borderTopRightRadius: width * 0.8,
    opacity: 0.5,
  },

  // ── Floating orbs ──
  orb1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(242, 203, 7, 0.07)",
  },
  orb2: {
    position: "absolute",
    bottom: 100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(100, 60, 220, 0.12)",
  },
  orb3: {
    position: "absolute",
    top: height * 0.4,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(242, 203, 7, 0.04)",
  },

  // ── Content layout ──
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },

  // ── Logo ──
  logoSection: {
    alignItems: "center",
    gap: 10,
  },
  logoGlowRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(242, 203, 7, 0.07)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F2CB07",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
  },
  logoRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: "rgba(242, 203, 7, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242, 203, 7, 0.04)",
  },
  logoInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 54,
    height: 54,
    resizeMode: "contain",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 7,
    marginTop: 4,
  },
  brandTagline: {
    fontSize: 11,
    color: "rgba(242, 203, 7, 0.65)",
    letterSpacing: 2.5,
    fontWeight: "500",
  },

  // ── Form card ──
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    padding: 26,
    gap: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  cardTopLine: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  formSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    marginTop: -6,
    letterSpacing: 0.2,
  },

  // ── Inputs ──
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    height: 54,
  },
  inputFocused: {
    borderColor: "rgba(242, 203, 7, 0.55)",
    backgroundColor: "rgba(242, 203, 7, 0.04)",
  },
  inputIconWrap: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  eyeBtn: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },

  forgotWrap: { alignSelf: "flex-end", marginTop: -2 },
  forgot: {
    color: "rgba(242, 203, 7, 0.7)",
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Button (no LinearGradient) ──
  button: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#F2CB07",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonInner: {
    height: 54,
    backgroundColor: "#F2CB07",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // subtle top highlight to mimic gradient
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
  },
  buttonText: {
    color: "#1A0E4F",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});