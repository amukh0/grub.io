import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebase.template";
import { clearUnsubscribers, registerUnsubscriber } from "../firestoreListeners.template";


type Event = {
  id: string;
  title: string;
  description: string;
  date: string | { seconds: number; nanoseconds: number };
  createdBy: string;
  attendees: string[];
  joinCode?: string;
};

/**
 * Functional component for the home screen displaying user's events.
 * @returns {JSX.Element} HomeScreen component
 */
export default function HomeScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const getEvents = async () => {
    const user = auth.currentUser;
    if (!user) return;

    // IDK why we need this but just in case bc ts is yelling at me
    const uid = user.uid;

    try {
      const eventsRef = collection(db, "events");
      const q = query(eventsRef, where("attendees", "array-contains", uid));
      const snapshot = await getDocs(q);

      // silent err handling if user signed out really fast
      if (!auth.currentUser) {
        //console.info("getEvents aborted: user signed out during request");
        return;
      }

      const eventData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];

      setEvents(eventData);
    } catch (error) {
      const code = (error as any)?.code || (error as any)?.message;
      // if user signed out randomly, maybe can take out later
      if (String(code).includes("permission-denied") && !auth.currentUser) {
        //console.info("Permission denied fetching events after sign-out; suppressing error.");
        return;
      }

      //console.error("Error fetching events:", error);
      // for weird permission issues go back to login
      if (String(code).includes("permission-denied")) {
        try {
          router.replace("/login");
        } catch (navErr) {
          //console.error("Failed to navigate to login after permission error:", navErr);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getEvents();

    // listener for notifications
    const user = auth.currentUser;
    if (!user) return;

    const notificationsRef = collection(db, "notifications");
    const q = query(
        notificationsRef,
        where("userId", "==", user.uid),
        where("read", "==", false)
    );

  const unsubscribe = onSnapshot( q, (snapshot) => { setUnreadCount(snapshot.size);},
    (err) => {
      //console.error("Notifications snapshot error:", err);
      // listener logout error handling
      const code = (err as any)?.code || (err as any)?.message;
      if (String(code).includes("permission-denied")) {
        try {
          router.replace("/login");
        } catch (navErr) {
          //console.error("Navigation to login failed after listener error:", navErr);
        }
      }
    }
  );
    // force unregister for logout, throws weird errors otherwise
    registerUnsubscriber(unsubscribe);

    return () => {
      try { unsubscribe(); } catch (e) { /* do nothin */ }
    };
  }, []);

  /**
   * Function to handle pull-to-refresh action.
   * @returns {void}
   */
  const handleRefresh = () => {
    setRefreshing(true);
    getEvents();
  };

  /**
   * Function to log out the current user.
   * @returns {void}
   */
  const logout = async () => {
    // this is for the weird errors maybe better way?
    try {
      clearUnsubscribers();
    } catch (err) {
      //console.error("Error clearing unsubscribers:", err);
    }

    try {
      router.replace("/login");
    } catch (navErr) {
      //console.error("Navigation to login failed:", navErr);
    }

    try {
      await signOut(auth);
    } catch (err) {
      //console.error("Sign out failed:", err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Grub.io</Text>
            <Text style={styles.greeting}>My Events</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications")}
          >
            <MaterialIcons name="notifications" size={28} color="#111" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => router.push({ pathname: "/event/[id]", params: { id: item.id } })}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <MaterialIcons name="chevron-right" size={24} color="#999" />
              </View>
              <Text style={styles.eventDate}>
                {typeof item.date === 'object' && item.date?.seconds // changing from timestamp to nicer date thing
                  ? new Date(item.date.seconds * 1000).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : typeof item.date === 'string'
                  ? new Date(item.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : "No date"}
              </Text>
              {item.description && (
                <Text style={styles.eventDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              {item.joinCode && (
                <View style={styles.joinCodeBadge}>
                  <MaterialIcons name="qr-code-2" size={14} color={GREEN} />
                  <Text style={styles.joinCodeText}>{item.joinCode}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="event" size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptySubtitle}>
                Create an event or join one with a code
              </Text>
            </View>
          }
          contentContainerStyle={events.length === 0 ? styles.emptyContainer : undefined}
        />

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => router.push("/create-event")}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Create Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => router.push("/join-event")}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color={ACCENT} />
              <Text style={styles.secondaryButtonText}>Join Event</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <MaterialIcons name="logout" size={18} color="#666" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my awesome accent color
const GREEN = "#4CAF50"; // green for codes and stuff

/**
 * Styles for the HomeScreen component.
 */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFB" },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 4,
    paddingBottom: 16,
  },
  brand: { 
    color: ACCENT, 
    fontWeight: "700", 
    fontSize: 18,
    marginBottom: 4,
  },
  greeting: { 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#111" 
  },
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: ACCENT,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  eventTitle: { 
    fontSize: 18, 
    fontWeight: "600", 
    color: "#111",
    flex: 1,
  },
  eventDate: { 
    color: "#666", 
    fontSize: 14,
    marginBottom: 8,
  },
  eventDescription: { 
    color: "#888",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  joinCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 6,
  },
  joinCodeText: {
    color: GREEN,
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  footer: {
    paddingVertical: 20,
    paddingBottom:8,
    gap: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: ACCENT,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: ACCENT,
  },
  secondaryButtonText: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  logoutText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
});