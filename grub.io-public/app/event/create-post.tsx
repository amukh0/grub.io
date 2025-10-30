import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db, storage } from "../../src/firebase.template";

/**
 * Screen component for creating a new food post within an event.
 * @returns {JSX.Element} CreatePostScreen component
 */
export default function CreatePostScreen() {
  const { eventId } = useLocalSearchParams(); 
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);


  /**
   * Function to pick an image from the user's photo library.
   * @returns {void}
   */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  /**
   * Function to upload an image to Firebase Storage and get its download URL.
   * @param {string} uri - Local URI of the image to upload
   * @returns {Promise<string>} - Download URL of the uploaded image
   */
  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `posts/${eventId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  /**
   * Function to create a new food post in the event.
   * @returns {void}
   */
  const createPost = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill in title and description.");
      return;
    }

    setUploading(true);

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid)); // get display name
      const userName = userDoc.exists() ? (userDoc.data() as { displayName?: string })?.displayName : null;
      
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      const postsRef = collection(db, "events", eventId as string, "posts");
      await addDoc(postsRef, {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        imageUrl,
        userId: user.uid,
        userName,
        userEmail: user.email,
        claimedBy: null,
        claimedByName: null,
        claimedByEmail: null,
        completed: false,
        createdAt: Timestamp.now(),
      });

      Alert.alert("Success", "Food post created!");
      router.back();
    } catch (error: any) {
      console.error("Error creating post:", error);
      Alert.alert("Error", error.message);
    } finally {
      setUploading(false);
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
          <Text style={styles.title}>Post Available Food</Text>
          <Text style={styles.subtitle}>
            Share extra food with others at your event
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Food Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Extra Pizza Slices"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="5 slices of pepperoni pizza"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Upper floor, room 212"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Photo (Optional)</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <MaterialIcons 
                name={imageUri ? "edit" : "add-photo-alternate"} 
                size={24} 
                color={ACCENT} 
              />
              <Text style={styles.imageButtonText}>
                {imageUri ? "Change Photo" : "Add Photo"}
              </Text>
            </TouchableOpacity>

            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            )}

            <TouchableOpacity
              style={[styles.createButton, uploading && styles.createButtonDisabled]}
              onPress={createPost}
              disabled={uploading}
            >
              <MaterialIcons name="restaurant" size={20} color="#fff" />
              <Text style={styles.createButtonText}>
                {uploading ? "Posting..." : "Post Food"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my super awesome accent color

/**
 * Styles for the CreatePostScreen component.
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
  imageButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 15,
    color: ACCENT,
    fontWeight: "600",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 18,
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