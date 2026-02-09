// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   Image,
//   TouchableOpacity,
//   TextInput,
//   StyleSheet,
//   Alert,
//   ScrollView,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import * as ImagePicker from "expo-image-picker";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useRouter } from "expo-router";
// import { SafeAreaView } from "react-native-safe-area-context";

// export default function ProfileScreen() {
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [imageUri, setImageUri] = useState<string | null>(null);

//   useEffect(() => {
//     loadProfile();
//   }, []);

//   const loadProfile = async () => {
//     const savedName = await AsyncStorage.getItem("profile_name");
//     const savedImage = await AsyncStorage.getItem("profile_image");
//     const savedEmail = await AsyncStorage.getItem("user_email");

//     if (savedName) setName(savedName);
//     if (savedImage) setImageUri(savedImage);
//     if (savedEmail) setEmail(savedEmail);
//   };

//   const pickImage = async () => {
//     const permission =
//       await ImagePicker.requestMediaLibraryPermissionsAsync();

//     if (!permission.granted) {
//       Alert.alert("Permission required");
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.8,
//     });

//     if (!result.canceled) {
//       const uri = result.assets[0].uri;
//       setImageUri(uri);
//       await AsyncStorage.setItem("profile_image", uri);
//     }
//   };

//   const saveName = async () => {
//     const trimmed = name.trim();
//     if (!trimmed) {
//       Alert.alert("Name required");
//       return;
//     }

//     await AsyncStorage.setItem("profile_name", trimmed);
//     Alert.alert("Profile updated");
//   };

//   const logout = async () => {
//     await AsyncStorage.clear();
//     router.replace("/(auth)/login");
//   };

//   return (
//     <SafeAreaView style={styles.safe}>
//       <ScrollView contentContainerStyle={styles.scroll}>
//         {/* LOGOUT */}
//         <TouchableOpacity style={styles.logoutIcon} onPress={logout}>
//           <Ionicons name="log-out-outline" size={28} color="#F87171" />
//         </TouchableOpacity>

//         {/* CARD */}
//         <View style={styles.card}>
//           {/* AVATAR */}
//           <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
//             {imageUri ? (
//               <Image source={{ uri: imageUri }} style={styles.avatar} />
//             ) : (
//               <View style={styles.placeholder}>
//                 <Ionicons name="person" size={48} color="#fff" />
//               </View>
//             )}
//             <Text style={styles.changeText}>Change Photo</Text>
//           </TouchableOpacity>

//           {/* NAME */}
//           <TextInput
//             value={name}
//             onChangeText={setName}
//             placeholder="Your name"
//             placeholderTextColor="#CFC6F5"
//             style={styles.input}
//           />

//           {/* SAVE */}
//           <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
//             <Ionicons name="save-outline" size={18} color="#1A1426" />
//             <Text style={styles.saveText}> Save</Text>
//           </TouchableOpacity>

//           {/* EMAIL */}
//           <View style={styles.emailBox}>
//             <Ionicons name="mail-outline" size={18} color="#F2CB07" />
//             <Text style={styles.emailText}>{email}</Text>
//           </View>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe: {
//     flex: 1,
//     backgroundColor: "#38208C",
//   },
//   scroll: {
//     flexGrow: 1,
//     padding: 20,
//     alignItems: "center",
//   },

//   logoutIcon: {
//     alignSelf: "flex-end",
//     marginBottom: 10,
//   },

//   card: {
//     backgroundColor: "#2D1873",
//     borderRadius: 16,
//     padding: 24,
//     alignItems: "center",
//     width: "100%",
//   },

//   avatarWrap: {
//     alignItems: "center",
//     marginBottom: 20,
//   },

//   avatar: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//   },

//   placeholder: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     backgroundColor: "#3E2A9B",
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   changeText: {
//     marginTop: 8,
//     color: "#F2CB07",
//     fontWeight: "500",
//   },

//   input: {
//     width: "100%",
//     backgroundColor: "#3E2A9B",
//     borderRadius: 10,
//     padding: 14,
//     color: "#fff",
//     marginTop: 10,
//   },

//   saveBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#F2CB07",
//     paddingVertical: 12,
//     paddingHorizontal: 30,
//     borderRadius: 10,
//     marginTop: 16,
//   },

//   saveText: {
//     color: "#1A1426",
//     fontWeight: "600",
//     fontSize: 16,
//   },

//   emailBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 24,
//   },

//   emailText: {
//     marginLeft: 8,
//     color: "#F2CB07",
//     fontWeight: "600",
//   },
// });
