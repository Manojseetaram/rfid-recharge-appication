import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';

export default function ConnectScreen() {
  const router = useRouter();
  const [copies, setCopies] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <View style={styles.container}>
      {/* 🔙 Top Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <IconSymbol name="chevron.left" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.title}>Printer Connected</Text>

      <View style={styles.card}>
        <Text style={styles.text}>Bluetooth: ON</Text>
        <Text style={styles.text}>Status: Connected</Text>

        {/* Input 1 */}
        <TextInput
          placeholder="Enter number of copies"
          placeholderTextColor="#CFC6F5"
          value={copies}
          onChangeText={setCopies}
          keyboardType="numeric"
          style={styles.input}
        />

        {/* Input 2 */}
        <TextInput
          placeholder="Enter amount"
          placeholderTextColor="#CFC6F5"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Proceed to Print</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#38208C',
    padding: 20,
  },
  backBtn: {
    marginTop: 10,
    marginBottom: 10,
    width: 40,
  },
  title: {
    color: '#F2CB07',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2D1873',
    borderRadius: 14,
    padding: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#3E2A9B',
    borderRadius: 10,
    padding: 14,
    color: '#FFFFFF',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#F2CB07',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#1A1426',
    fontSize: 16,
    fontWeight: '600',
  },
});
