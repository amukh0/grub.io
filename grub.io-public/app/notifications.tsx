import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../src/firebase.template";
import { registerUnsubscriber } from "../src/firestoreListeners.template";

type Notification = {
  id: string;
  type: string;
  message: string;
  eventId: string;
  postId: string;
  read: boolean;
  createdAt: any;
};

/**
 * Functional component for displaying user notifications.
 * @returns {JSX.Element} NotificationsScreen component
 */
export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];
        setNotifications(notifs);
      }, (err) => {
        //console.error("Notifications snapshot error:", err);
        const code = (err as any)?.code || (err as any)?.message;
        if (String(code).includes("permission-denied")) {
          try { router.replace("/login"); } catch(e) { console.error(e); }
        }
      }
    );

    registerUnsubscriber(unsubscribe);

    return () => { try { unsubscribe(); } catch(e) {} };
  }, [currentUser]);

  /**
   * Function to mark a notification as read.
   * @param {string} notificationId - ID of the notification to mark as read
   * @return {void}
   */
  const markAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      //console.error("Error marking notification as read:", error);
    }
  };

  /**
   * Function to handle notification press event.
   * @param {Notification} notification - Notification object that was pressed
   * @returns {void}
   */
  const notificationPress = (notification: Notification) => {
    markAsRead(notification.id);
  
    router.push({ pathname: "/event/[id]", params: { id: notification.eventId } });
  };

  /**
   * Function to get the appropriate icon name for a notification type.
   * @param {string} type - notification icon name
   * @returns {void}
   */
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "claim":
        return "shopping-basket";
      default:
        return "notifications";
    }
  };

  /**
   * Function to render a single notification item.
   * @param {Notification} item - notification object 
   * @returns {JSX.Element} rendered notification item
   */
  const renderNotification = ({ item }: { item: Notification }) => (
     <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => notificationPress(item)}
    >
      <View style={[styles.iconCircle, !item.read && styles.iconCircleUnread]}>
        <MaterialIcons 
          name={getNotificationIcon(item.type)} 
          size={20} 
          color={!item.read ? ACCENT : "#666"} 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={[styles.message, !item.read && styles.unreadText]}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {item.createdAt?.seconds
            ? formatTimestamp(item.createdAt.seconds)
            : "Just now"}
        </Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
      
      <MaterialIcons name="chevron-right" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  /**
   * Function to format timestamp into a readable string to display.
   * @param {number} seconds 
   * @returns {string} formatted timestamp
   */
  const formatTimestamp = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

        <View style={styles.titleSection}>
          <Text style={styles.brand}>Grub.io</Text>
          <Text style={styles.title}>Notifications</Text>
          {notifications.filter(n => !n.read).length > 0 && (
            <Text style={styles.unreadCount}>
              {notifications.filter(n => !n.read).length} unread
            </Text>
          )}
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-none" size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                {"You'll be notified when someone claims your food posts"}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#FF3B30"; // my super awesome accent color

/**
 * Styles for the NotificationsScreen component.
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
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    marginBottom: 4,
  },
  unreadCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFF4",
  },
  unreadCard: {
    backgroundColor: "#FFF5F5",
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconCircleUnread: {
    backgroundColor: "#FFE5E5",
  },
  notificationContent: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: "#444",
    marginBottom: 4,
    lineHeight: 20,
  },
  unreadText: {
    fontWeight: "600",
    color: "#111",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});