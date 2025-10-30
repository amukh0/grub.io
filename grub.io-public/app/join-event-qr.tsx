import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { arrayUnion, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../src/firebase.template";


/**
 * Functional component for joining an event via scanning a QR code.
 * @returns {JSX.Element} JoinEventQRScreen component
 */
export default function JoinEventQRScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();


  /**
   * Function to handle barcode scan event.
   * @param {string} data - scanned QR code data
   * @returns {void}
   */
  const barcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to join an event.");
      setScanned(false);
      return;
    }

    try {
      // get join code from QR data (format: "GRUBIO:ABC123")
      const joinCode = data.startsWith("GRUBIO:") ? data.substring(7) : data;

      // search for event
      const eventsRef = collection(db, "events");
      const q = query(eventsRef, where("joinCode", "==", joinCode.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("Not Found", "No event found with that QR code.", [
          { text: "Scan Again", onPress: () => setScanned(false) }
        ]);
        return;
      }

      const eventDoc = snapshot.docs[0]; // matching event doc
      const eventData = eventDoc.data();

      if (eventData.attendees?.includes(user.uid)) { // already an attendee edge case
        Alert.alert("Already Joined", "You're already part of this event!");
        router.replace({ pathname: "/event/[id]", params: { id: eventDoc.id } });
        return;
      }

      const eventRef = doc(db, "events", eventDoc.id); // otherwise add new attendee
      await updateDoc(eventRef, {
        attendees: arrayUnion(user.uid),
      });

      // UNNECESSARY ALERT
      //Alert.alert("Success!", `You've joined "${eventData.title}"!`);
      router.replace({ pathname: "/event/[id]", params: { id: eventDoc.id } });
    } catch (error: any) {
      //console.error("Error joining event:", error);
      Alert.alert("Error", "Could not join event. Please try again.", [
        { text: "Scan Again", onPress: () => setScanned(false) }
      ]);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
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
            <MaterialIcons name="camera-alt" size={64} color="#DDD" />
            <Text style={styles.title}>Camera Permission Required</Text>
            <Text style={styles.subtitle}>
              I need access to your camera to scan QR codes
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <MaterialIcons name="camera" size={20} color="#fff" />
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cameraContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonCamera}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : barcodeScanned}
        />
        {/* attempting to fix camera overlay issues */}
        <View style={[styles.overlay, StyleSheet.absoluteFill]}>
          <View style={styles.scanArea} pointerEvents="none">
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.instructionText}>
            Point your camera at a Grub.io QR code
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my super awesome accent color
const GREEN = "#4CAF50"; // green for codes and stuff

/**
 * Styles for the JoinEventQRScreen component.
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
  backButtonCamera: {
    padding: 8,
    marginLeft: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: GREEN,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 40,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});