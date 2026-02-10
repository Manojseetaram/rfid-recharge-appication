import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../(tabs)/home/customalert";


export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [showContactAlert, setShowContactAlert] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setShowAlert(true);
      return;
    }

    // ✅ SAVE LOGIN STATE
    await AsyncStorage.setItem("user_email", email.trim());
    await AsyncStorage.setItem("is_logged_in", "true");
    router.replace("/(tabs)/home");
  };

  const handleForgotPassword = () => {
    setShowContactAlert(true);
  };

  const handleCallSupport = () => {
    setShowContactAlert(false);
    const { Linking } = require("react-native");
    Linking.openURL("tel:7899957067");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            {/* TODO: Replace with your company logo */}
            {/* <Image source={require('./path/to/logo.png')} style={styles.logo} /> */}
            
            {/* Placeholder for logo - remove this when adding real logo */}
           
              {/* <Ionicons name="business" size={48} color="#F2CB07" />
              <Text style={styles.logoText}>Your Logo</Text> */}
              

<Image source={require('../../assets/images/Lorenta-1.png')} style={styles.logo} />
            
            <Text style={styles.title}>Login</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Email / Gmail"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Alert */}
        <CustomAlert
          visible={showAlert}
          type="error"
          title="Error"
          message="Please enter email and password"
          onConfirm={() => setShowAlert(false)}
        />

        {/* Contact Support Alert */}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#38208C",
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  
  // Logo placeholder - remove when adding real logo
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: "rgba(242, 203, 7, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(242, 203, 7, 0.3)",
  },
  logoText: {
    color: "#F2CB07",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  
  // Real logo style - use this when adding your image
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 24,
  },
  
  title: {
    fontSize: 32,
    color: "#FFF",
    textAlign: "center",
    fontWeight: "700",
  },
  formContainer: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#1A1426",
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: "#F2CB07",
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#1A1426",
    fontSize: 18,
    fontWeight: "700",
  },
  forgot: {
    color: "#F2CB07",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
  },
});