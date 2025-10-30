import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../src/firebase.template";


/**
 * Function to generate a random 6-character join code.
 * @returns {string} code - A randomly generated 6-character join code consisting of uppercase letters and digits.
 */
const generateJoinCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // capital letters + numbers
  let code = "";
  for (let i = 0; i < 6; i++) { 
    code += chars.charAt(Math.floor(Math.random() * chars.length)); // make code logic 
  }
  return code;
};

/**
 * Function to check if a join code is unique (not already used by any existing event).
 * This function sometimes throws errors due to permission issues; ensure proper Firestore rules are set!
 * @param {string} code - join code to check
 * @returns {boolean} - true if the join code is unique (not used by any existing event)
 */
const isJoinCodeUnique = async (code: string): Promise<boolean> => {
  const eventsRef = collection(db, "events");
  const q = query(eventsRef, where("joinCode", "==", code));
  const snapshot = await getDocs(q);
  return snapshot.empty; // only true if no events have this code
}; 

/**
 * Screen component for creating a new event.
 * @returns {JSX.Element} CreateEventScreen component
 */
export default function CreateEventScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * Function to handle event creation.
   * @returns {void}
   */
  const createEvent = async () => {
    const user = auth.currentUser;
    //console.log("Current user:", user);  // debug line
    //console.log("User ID:", user?.uid);  // debug line
    //console.log("Email:", user?.email);  // debug line


    if (!user) {
      Alert.alert("Error", "You must be logged in to create an event.");
      return;
    }

    if (!title || !description || !date) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
        //console.log("2. Generating join code...");
        let joinCode = generateJoinCode();
        let isUnique = await isJoinCodeUnique(joinCode);

        //console.log("3. Join code generated:", joinCode);

      
        // keep generating til new code, only should matter when we have lots of events
        while (!isUnique) {
            joinCode = generateJoinCode();
            isUnique = await isJoinCodeUnique(joinCode);
        }
        //console.log("4. Creating event document...");

        const eventRef = collection(db, "events");
        const docRef = await addDoc(eventRef, {
            title,
            description,
            date: Timestamp.fromDate(new Date(date)),
            createdBy: user.uid,
            attendees: [user.uid],
            joinCode,
            createdAt: Timestamp.now(),
        });
        //console.log("5. Event document created with ID:", docRef.id);

    // UNNECESSARY ALERT
    // Alert.alert("Success", `Event created! Join code: ${joinCode}`);

    //console.log("Created event id:", docRef.id);  // debug line
    // got to newly created event screen!!
    //console.log("6. Navigating to event...");

    router.replace({ pathname: "/event/[id]", params: { id: docRef.id } });
    } catch (error: any) {
      //console.error("Error creating event:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.brand}>Grub.io</Text>
          <Text style={styles.title}>Create a New Event</Text>
          <Text style={styles.subtitle}>
            Share food at tailgates, competitions, and more
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Event Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Ducks vs Them Tailgate"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your event..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={setDate}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={createEvent}
              disabled={loading}
            >
              <MaterialIcons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>
                {loading ? "Creating..." : "Create Event"}
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my super awesome accent color


/**
 * Styles for the CreateEventScreen component.
 */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFB" },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 40 },
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
    paddingHorizontal: 20,
  },
  brand: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
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
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    marginBottom: 18,
    fontSize: 16,
    color: "#111",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
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