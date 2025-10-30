import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { arrayUnion, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../src/firebase.template";

/**
 * Functional component for joining an event using a join code.
 * @returns {JSX.Element} JoinEventScreen component
 */
export default function JoinEventScreen() {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoinEvent = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to join an event.");
      return;
    }

    if (!joinCode.trim()) {
      Alert.alert("Error", "Please enter a join code.");
      return;
    }

    setLoading(true);

    try {
      // search for event
      const eventsRef = collection(db, "events"); 
      const q = query(eventsRef, where("joinCode", "==", joinCode.trim().toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("Not Found", "No event found with that join code. Please check and try again.");
        setLoading(false);
        return;
      }

      const eventDoc = snapshot.docs[0]; // matching event doc
      const eventData = eventDoc.data();

      if (eventData.attendees?.includes(user.uid)) { // already an attendee edge case
        Alert.alert("Already Joined", "You're already part of this event!");
        router.replace({ pathname: "/event/[id]", params: { id: eventDoc.id } });
        setLoading(false);
        return;
      }

      const eventRef = doc(db, "events", eventDoc.id); // otherwise add new attendee
      await updateDoc(eventRef, {
        attendees: arrayUnion(user.uid),
      });

      Alert.alert("Success!", `You've joined "${eventData.title}"!`);
      router.replace({ pathname: "/event/[id]", params: { id: eventDoc.id } });
    } catch (error: any) {
      console.error("Error joining event:", error);
      Alert.alert("Error", "Could not join event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="qr-code-scanner" size={64} color={GREEN} />
          </View>

          <Text style={styles.title}>Join an Event</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character code shared by the event organizer
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Event Code</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.joinButton, loading && styles.joinButtonDisabled]}
              onPress={handleJoinEvent}
              disabled={loading}
            >
              <MaterialIcons name="login" size={20} color="#fff" />
              <Text style={styles.joinButtonText}>
                {loading ? "Joining..." : "Join Event"}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => router.push("/join-event-qr")}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color={GREEN} />
              <Text style={styles.qrButtonText}>Scan QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => router.back()}
            >
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my super awesome accent color
const GREEN = "#4CAF50"; // green for codes and stuff

/**
 * Styles for the JoinEventScreen component.
 */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFB" },
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    marginTop: -60,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  label: {
    color: "#444",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 4,
    fontWeight: "600",
    marginBottom: 20,
    color: "#111",
  },
  joinButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  qrButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  qrButtonText: {
    color: GREEN,
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "500",
  },
});