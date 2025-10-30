import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase.template";

/**
 * Functional component for user login and sign-up.
 * @returns {JSX.Element} LoginScreen component
 */
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const signUp = async () => {
    if (isSubmitting) return;
    
    if (!displayName.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    
    setIsSubmitting(true); 
    try { // this is for authorization error handling
      const userCredential = await createUserWithEmailAndPassword( auth, email.trim(), password);
      
      // create user 
      await setDoc(doc(db, "users", userCredential.user.uid), { displayName: displayName.trim(),email: email.trim(),createdAt: new Date()});

      // UNNECESSARY ALERT
      // Alert.alert("Account created!", `Welcome ${displayName}!`); 
      router.replace("/home");
    } catch (error: any) { // error handling things 
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "That email is already registered. Try logging in instead.");
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Function to handle user sign-in.
   * @returns {void}
   */
  const signIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword( auth, email.trim(), password); // var is unused
      router.replace("/home");
    } catch (error: any) { // more error handling
      if (error.code === "auth/user-not-found") {
        Alert.alert("Error", "No account found. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password. Try again.");
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.container}
      >
        <View style={styles.header}> 
          <Text style={styles.brand}>Grub.io</Text>
          <Text style={styles.h1}>{isSignUp ? "Create Your Account" : "Welcome Back"}</Text>
          <Text style={styles.sub}>{isSignUp ? "Sign up to see food in your area!" : "Login to see your events and live feed!"}</Text>
        </View>
        
        <View style={styles.form}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              placeholderTextColor={"#999"}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          )}
          
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={"#999"}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Email"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={"#999"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            accessibilityLabel="Password"
          />
      
          <TouchableOpacity
            style={styles.signInButton}
            disabled={isSubmitting}
            onPress={isSignUp ? signUp : signIn}
            accessibilityRole="button"
          >
            <MaterialIcons name='login' size={20} color="#fff" />
            <Text style={styles.signInText}> {isSignUp ? "Create Account" : "Login"}</Text>
          </TouchableOpacity>

          
          <View style={styles.spacer} />
          
          <Button 
            title={isSignUp ? "Already have an account? Login" : "Need an account? Sign Up"}
            onPress={() => setIsSignUp(!isSignUp)}
            color="#666"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my super awesome accent color

/**
 * Styles for the LoginScreen component.
 */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFB" },
  container: { flex: 1, padding: 20, justifyContent: "space-between" },
  header: { marginTop: 12 },
  brand: { color: ACCENT, fontWeight: "700", fontSize: 18 },
  h1: { fontSize: 28, fontWeight: "700", marginTop: 6, color: "#111" },
  sub: { marginTop: 6, color: "#666", fontSize: 14 },
  form: { marginTop: 18 },
  label: { color: "#444", fontSize: 13, marginBottom: 6 },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "600",
  },
  signInButton: {
    marginTop: 18,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    marginBottom: 15,
    fontSize: 15,
  },
  spacer: {
    height: 15,
  },
  signInText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 14, gap: 6 },
  small: { color: "#666" },
  link: { color: ACCENT, fontWeight: "600" },
});

