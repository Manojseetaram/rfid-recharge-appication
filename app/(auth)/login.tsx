import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

 const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter email and password');
    return;
  }

  // TODO: save login state
  // await SecureStore.setItemAsync('token', 'abc');

  router.replace('/(tabs)');
};


  const handleForgotPassword = () => {
    Alert.alert(
      'Contact Support',
      'Email: lorentatechnolgy@gmail.com\nPhone: 7899957067',
      [
        {
          text: 'Call Now',
          onPress: () => Linking.openURL('tel:7899957067'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Warden Login</Text>

      <TextInput
        placeholder="Email / Gmail"
        placeholderTextColor="#ddd"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#ddd"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#38208C',
  },
  title: {
    fontSize: 26,
    color: '#F2CB07',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 14,
    color: '#1A1426',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#F2CB07',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#1A1426',
    fontSize: 16,
    fontWeight: '600',
  },
  forgot: {
    color: '#F2CB07',
    textAlign: 'center',
    marginTop: 18,
    fontWeight: '500',
  },
});
