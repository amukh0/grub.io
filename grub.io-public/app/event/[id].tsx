import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Image, Share as RNShare, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../src/firebase.template";
import { registerUnsubscriber } from "../../src/firestoreListeners.template";


type Post = {
  id: string;
  title: string;
  description: string;
  location?: string;
  imageUrl?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  claimedBy?: string | null;
  claimedByName?: string | null;
  claimedByEmail?: string | null;
  completed: boolean;
  createdAt: any;
};

type TabType = "feed" | "share" | "analytics"; // three tabs to toggle


/**
 * Screen component for viewing an event.
 * @returns {JSX.Element} Event screen component
 */
export default function EventScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [event, setEvent] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const currentUser = auth.currentUser;

  // get event data
  useEffect(() => {

    /**
     * Function to get event details from Firestore.
     * @returns {void}
     */
    const fetchEvent = async () => {
      if (!id) return;
      try {
        const eventRef = doc(db, "events", id as string);
        const snapshot = await getDoc(eventRef);
        if (snapshot.exists()) {
          setEvent({ id: snapshot.id, ...snapshot.data() });
        } else {
          Alert.alert("Not found", `No event found for id: ${id}`);
        }
      } catch (err) {
        //console.error("Error fetching event:", err);
        Alert.alert("Fetch error", String(err));
      }
    };

    fetchEvent();
  }, [id]);

  // listener! check posts for completed and archive if so
  useEffect(() => {
    if (!id) return;
    const postsRef = collection(db, "events", id as string, "posts");
    const q = query(postsRef, where("completed", "==", false), orderBy("createdAt", "desc"));

    /**
     * Function to listen for real-time updates to posts.
     * @return {void}
     */
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const allPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Post[];
        setPosts(allPosts);
        setFilteredPosts(allPosts);
      }, (err) => {
        //console.error("Posts snapshot error:", err);
        const code = (err as any)?.code || (err as any)?.message;
        if (String(code).includes("permission-denied")) {
          Alert.alert("Permission error", "Listener lost permission. Redirecting to login.");
          try {
            router.replace("/login");
          } catch (e) {
            //console.error(e);
          }
        }
      }
    );

    // register listener for cleanup on logout
    try {
      registerUnsubscriber(unsubscribe);
    } catch (e) {
      // do nothing
    }

    return () => {
      try { unsubscribe(); } catch (e) {}
    };
  }, [id]);

  // listener for ALL posts
  useEffect(() => {
    if (!id) return;
    const postsRef = collection(db, "events", id as string, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    

    /**     
     * Function to listen for all posts for analytics purposes.
     * @return {void}
     */
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPostsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Post[];
      setAllPosts(allPostsData);
    }, (err) => {
      //console.error("Posts snapshot error:", err);
        const code = (err as any)?.code || (err as any)?.message;
        if (String(code).includes("permission-denied")) {
          Alert.alert("Permission error", "Listener lost permission. Redirecting to login.");
          try {
            router.replace("/login");
          } catch (e) {
            //console.error(e);
          }
        }
      }
    );

    // register listener for cleanup on logout
    try {
      registerUnsubscriber(unsubscribe);
    } catch (e) {
      // do nothing
    }

    return () => {
      try { unsubscribe(); } catch (e) {}
    };
  }, [id]);

    

  // search implementation
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
    } else {
      const query = searchQuery.toLowerCase(); // make search case insensitive
      const filtered = posts.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query) ||
        post.location?.toLowerCase().includes(query)
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  const claimPost = async (postId: string, currentClaimedBy: string | null, postOwnerId: string, postTitle: string) => {
    if (!currentUser) return;

    try {
      const postRef = doc(db, "events", id as string, "posts", postId);
      
      // get display name from Firestore
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userName = userDoc.exists() ? (userDoc.data() as { displayName?: string })?.displayName : null;
      
      // if already claimed by current user, unclaim it
      if (currentClaimedBy === currentUser.uid) {
        await updateDoc(postRef, {
          claimedBy: null,
          claimedByName: null,
          claimedByEmail: null,
        });
        Alert.alert("Unclaimed", "You've unclaimed this item.");
      } else {
        await updateDoc(postRef, {
          claimedBy: currentUser.uid,
          claimedByName: userName,
          claimedByEmail: currentUser.email,
        });

        // notification for post owner
        if (postOwnerId !== currentUser.uid) {
          const notificationsRef = collection(db, "notifications");
          await addDoc(notificationsRef, {
            userId: postOwnerId,
            type: "claim",
            message: `${userName || currentUser.email} claimed your "${postTitle}"`,
            eventId: id,
            postId: postId,
            read: false,
            createdAt: Timestamp.now(),
          });
        }

        // UNNECESSARY ALERT
        // Alert.alert("Claimed!", "You've claimed this item. Contact the poster to pick it up!");
      }
    } catch (error) {
      //console.error("Error claiming post:", error);
      Alert.alert("Error", "Could not update claim status.");
    }
  };

  /**
   * Function to mark a post as complete.
   * @param {string} postId - ID of the post to mark as complete
   * @return {void} 
   */
  const markComplete = async (postId: string) => {
    try {
      const postRef = doc(db, "events", id as string, "posts", postId);
      await updateDoc(postRef, {
        completed: true,
      });
      // UNNECESSARY ALERT
      //Alert.alert("Completed", "Post marked as complete and removed from feed.");
    } catch (error) {
      //console.error("Error marking complete:", error);
      Alert.alert("Error", "Could not mark as complete.");
    }
  };

  /**
   * Function to share the event join code.
   * @return {void}
   */
  const shareEvent = async () => {
    if (!event?.joinCode) return;
    try {
      await RNShare.share({
        message: `Join my event "${event.title}" on Grub.io! Use code: ${event.joinCode}`,
      });
    } catch (error) {
      //console.error("Error sharing:", error);
    }
  };

  /**
   * Function to render a single post in the event feed.
   * @param {Post} item - Post item to render
   * @return UI for a single post
   */
  const renderPost = ({ item }: { item: Post }) => {
    const isOwner = item.userId === currentUser?.uid;
    const isClaimed = !!item.claimedBy;
    const isClaimedByMe = item.claimedBy === currentUser?.uid;

    return (
      <View style={styles.postCard}>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
        )}
        
        <View style={styles.postContent}>
          <Text style={styles.postTitle}>{item.title}</Text>
          <Text style={styles.postDescription}>{item.description}</Text>
          
          {item.location && (
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.postLocation}>{item.location}</Text>
            </View>
          )}

          <Text style={styles.postMeta}>
            Posted by {item.userName || item.userEmail || "Anonymous"}
          </Text>

          {isClaimed && (
            <View style={styles.claimedBadge}>
              <MaterialIcons name="check-circle" size={16} color={GREEN} />
              <Text style={styles.claimedText}>
                Claimed by {isClaimedByMe ? "You" : (item.claimedByName || item.claimedByEmail)}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            {!isOwner && (
              <TouchableOpacity
                style={[
                  styles.claimButton,
                  isClaimed && !isClaimedByMe && styles.claimButtonDisabled,
                  isClaimedByMe && styles.unclaimButton,
                ]}
                onPress={() => claimPost(item.id, item.claimedBy || null, item.userId, item.title)}
                disabled={isClaimed && !isClaimedByMe}
              >
                <MaterialIcons 
                  name={isClaimedByMe ? "close" : isClaimed ? "lock" : "shopping-basket"} 
                  size={18} 
                  color="#fff" 
                />
                <Text style={styles.claimButtonText}>
                  {isClaimedByMe ? "Unclaim" : isClaimed ? "Claimed" : "Claim"}
                </Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => markComplete(item.id)}
              >
                <MaterialIcons name="done" size={18} color="#fff" />
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  /**
   * Function to render the Feed tab.
   * @return UI for the Feed tab
   */
  const renderFeedTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.feedHeader}>
        <Text style={styles.sectionHeader}>Event Feed</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push({ pathname: "/event/create-post", params: { eventId: id } })}
        >
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Post Food</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="restaurant" size={48} color="#DDD" />
            <Text style={styles.emptyText}>
              {searchQuery ? "No posts match your search" : "No food posted yet"}
            </Text>
          </View>
        }
      />
    </ScrollView>
  );

  /**
   * Function to render the Share tab.
   * @return UI for the Share tab
   */
  const renderShareTab = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.shareContent}>
      <View style={styles.qrSection}>
        

        {event?.joinCode && (
          <>
            <View style={styles.qrContainer}>
              <QRCode
                value={`GRUBIO:${event.joinCode}`}
                size={220}
                color="#111"
                backgroundColor="#fff"
              />
            </View>

            <View style={styles.joinCodeDisplay}>
              <MaterialIcons name="qr-code-2" size={24} color={GREEN} />
              <Text style={styles.joinCodeLarge}>{event.joinCode}</Text>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={shareEvent}>
              <MaterialIcons name="share" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );


    /**
     * Function to render the Analytics tab.
     * @return UI for the Analytics tab
     */
  const renderAnalyticsTab = () => {
    const totalPosts = allPosts.length;
    const claimedPosts = allPosts.filter(p => p.claimedBy).length;
    const completedPosts = allPosts.filter(p => p.completed).length;
    const percentSaved = totalPosts > 0 ? Math.round((claimedPosts / totalPosts) * 100) : 0;
    const foodWasteLbs = totalPosts * 0.5;
    const totalAttendees = event?.attendees?.length || 0;

    // Calculate food champions (most posts)
    const userPostCounts: { [key: string]: { count: number; name: string } } = {};
    allPosts.forEach(post => {
      const userName = post.userName || post.userEmail || "Anonymous";
      if (!userPostCounts[post.userId]) {
        userPostCounts[post.userId] = { count: 0, name: userName };
      }
      userPostCounts[post.userId].count++;
    });

    const foodChampions = Object.entries(userPostCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 3)
      .map(([, data]) => data);

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.analyticsContainer}>
        <Text style={styles.analyticsTitle}>Event Analytics</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#E8F5E9" }]}>
              <MaterialIcons name="eco" size={28} color={GREEN} />
            </View>
            <Text style={styles.statValue}>{foodWasteLbs} lbs</Text>
            <Text style={styles.statLabel}>Food Waste Eliminated</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FFF3E0" }]}>
              <MaterialIcons name="restaurant" size={28} color="#FF9800" />
            </View>
            <Text style={styles.statValue}>{totalPosts}</Text>
            <Text style={styles.statLabel}>Total Posts</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#E3F2FD" }]}>
              <MaterialIcons name="people" size={28} color="#2196F3" />
            </View>
            <Text style={styles.statValue}>{totalAttendees}</Text>
            <Text style={styles.statLabel}>Total Attendees</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FCE4EC" }]}>
              <MaterialIcons name="check-circle" size={28} color="#E91E63" />
            </View>
            <Text style={styles.statValue}>{percentSaved}%</Text>
            <Text style={styles.statLabel}>Food Saved</Text>
          </View>
        </View>

        {foodChampions.length > 0 && (
          <View style={styles.championsSection}>
            <Text style={styles.sectionTitle}>Food Champions</Text>
            <Text style={styles.sectionSubtitle}>Most active contributors</Text>
            {foodChampions.map((champion, index) => (
              <View key={index} style={styles.championCard}>
                <View style={styles.championRank}>
                  <Text style={styles.championRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.championInfo}>
                  <Text style={styles.championName}>{champion.name}</Text>
                  <Text style={styles.championPosts}>{champion.count} posts</Text>
                </View>
                {index === 0 && (
                  <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.additionalStats}>
          <View style={styles.additionalStatRow}>
            <Text style={styles.additionalStatLabel}>Claimed Posts</Text>
            <Text style={styles.additionalStatValue}>{claimedPosts}</Text>
          </View>
          <View style={styles.additionalStatRow}>
            <Text style={styles.additionalStatLabel}>Completed Posts</Text>
            <Text style={styles.additionalStatValue}>{completedPosts}</Text>
          </View>
          <View style={styles.additionalStatRow}>
            <Text style={styles.additionalStatLabel}>Active Posts</Text>
            <Text style={styles.additionalStatValue}>{totalPosts - completedPosts}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };


  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push("/home")}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <View style={styles.eventHeader}>
            <Text style={styles.brand}>Grub.io</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDescription}>{event.description}</Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={16} color="#666" />
              <Text style={styles.eventDate}>
                {event?.date?.seconds 
                  ? new Date(event.date.seconds * 1000).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : "No date"}
              </Text>
            </View>
          </View>

          {activeTab === "feed" && renderFeedTab()}
          {activeTab === "share" && renderShareTab()}
          {activeTab === "analytics" && renderAnalyticsTab()}

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "feed" && styles.activeTab]}
            onPress={() => setActiveTab("feed")}
          >
            <MaterialIcons 
              name="restaurant" 
              size={24} 
              color={activeTab === "feed" ? ACCENT : "#999"} 
            />
            <Text style={[styles.tabLabel, activeTab === "feed" && styles.activeTabLabel]}>
              Feed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "share" && styles.activeTab]}
            onPress={() => setActiveTab("share")}
          >
            <MaterialIcons 
              name="qr-code-2" 
              size={24} 
              color={activeTab === "share" ? ACCENT : "#999"} 
            />
            <Text style={[styles.tabLabel, activeTab === "share" && styles.activeTabLabel]}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "analytics" && styles.activeTab]}
            onPress={() => setActiveTab("analytics")}
          >
            <MaterialIcons 
              name="analytics" 
              size={24} 
              color={activeTab === "analytics" ? ACCENT : "#999"} 
            />
            <Text style={[styles.tabLabel, activeTab === "analytics" && styles.activeTabLabel]}>
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}


const ACCENT = "#FF3B30"; // my super awesome accent color
const GREEN = "#4CAF50"; // green for codes and stuff

/**
 * Styles for the EventScreen component.
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
  eventHeader: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  brand: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 15,
    color: "#666",
    marginBottom: 12,
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventDate: {
    color: "#666",
    fontSize: 14,
  },
  tabContent: {
    flex: 1,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  addButton: {
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFEFF4",
    marginHorizontal: 20,
    marginBottom: 16,
    fontSize: 15,
    color: "#111",
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EFEFF4",
  },
  postImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  postContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },
  postDescription: {
    fontSize: 15,
    color: "#666",
    marginBottom: 12,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  postLocation: {
    fontSize: 14,
    color: "#666",
  },
  postMeta: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
  },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  claimedText: {
    color: GREEN,
    fontWeight: "600",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  claimButton: {
    flex: 1,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  unclaimButton: {
    backgroundColor: "#FF9800",
  },
  claimButtonDisabled: {
    backgroundColor: "#CCC",
  },
  claimButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  completeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
    color: "#999",
    fontSize: 15,
  },
  shareContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  qrSection: {
    alignItems: "center",
  },
  shareTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  shareSubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  qrContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  joinCodeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  joinCodeLarge: {
    fontSize: 28,
    fontWeight: "700",
    color: GREEN,
    letterSpacing: 4,
  },
  shareButton: {
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  analyticsContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },analyticsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  analyticsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFF4",
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  championsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EFEFF4",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  championCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    gap: 12,
  },
  championRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  championRankText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
  },
  championInfo: {
    flex: 1,
  },
  championName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },
  championPosts: {
    fontSize: 13,
    color: "#666",
  },
  additionalStats: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFEFF4",
  },
  additionalStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  additionalStatLabel: {
    fontSize: 15,
    color: "#666",
  },
  additionalStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EFEFF4",
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: ACCENT,
  },
  tabLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontWeight: "500",
  },
  activeTabLabel: {
    color: ACCENT,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
});