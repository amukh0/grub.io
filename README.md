# Grub.io - Food Waste Reduction App

## Description

Large events (like tailgates, sports competitions, school events) are a huge source of food waste because teams order too much food, leftover food has no distribution system, and current food waste apps aren't designed for events.

**Grub.io** connects people with extra food to those who may need it at the same event, reducing waste and allowing event hosts to track their impact.

---

## Features

### Functionality
- **Event Creation & Management**: Create events with unique join codes and QR codes
- **Food Posting**: Post available food with photos, descriptions, and locations
- **Claiming**: Users can claim food items directly from their feed
- **Live Updates**: Live feed shows available food instantly
- **In-App Notifications**: Get notified when someone claims your food
- **Search Posts**: Filter feed for specific food items
- **Analytics**: Track food waste eliminated, active users, and food "champions"

---

## Tech I Used

- **Frontend**: React Native (Expo)
- **Documentation**: JSDoc for function purpose, parameters, and return values
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Firebase Authentication, Firestore, Firebase Storage (for images)
- **UI Components**: React Native core components, @expo/vector-icons (Material Icons), react-native-qrcode-svg, expo-camera, Lottie Animations
- **Testing**: Tested using Expo Go on iPhone 15

---

## Security
Because a paid firebase account was used, I have excluded some files required to make this repo functional. I have template files in their place. This is to protect my firebase and billing information. You will need to create your own firebase project in order to run this app. In order to use the full functionality of the app (including the QR scanner, and image upload), you will need a paid Firebase account to use storage. 


---

## App Structure

```
grub.io-public/
 ├── app/
 │   ├── event/
 │   │   ├── [id].tsx              # Event detail with tabs (Feed, Share, Analytics)
 │   │   └── create-post.tsx       # Create food posts
 │   ├── _layout.tsx               # Root layout with auth context
 │   ├── create-event.tsx          # Create new events
 │   ├── home.tsx                  # Event list homepage
 │   ├── index.tsx                 # Launch screen wrapper with splash animation
 │   ├── join-event.tsx            # Join via code
 │   ├── join-event-qr.tsx         # Join via QR scanner
 │   ├── login.tsx                 # Login/signup screen
 │   └── notifications.tsx         # Notifications page
 │
 ├── assets/
 │   ├── images.json 
 │   │   ├── favicon.png           # default fallback icon from expo
 │   │   ├── grubio_logo.png       # my logo
 │   │   └── splash-icon.png       # default fallback splash icon from expo
 │   └── hamburger.json            # Splash animation  
 │
 ├── src/
 │   ├── context/
 │   │   └── AuthContext.tsx       # Auth management
 │   ├── hooks/
 │   │   └── useAuth.ts            # Auth hook
 │   ├── screens/
 │   │   ├── home-screen.tsx        # Home screen component
 │   │   └── login-screen.tsx       # Login screen component
 │   ├── firebaseListeners.ts      # Listeners (template version included)
 │   └── firebase.ts               # Firebase configuration (template version included)
 │ 
 ├── app.json                      # expo project config
 ├── package-lock.json             # exact dependency versions
 ├── package.json                  # scripts, dependencies
 ├── README.md                     # descriptive readme (included both in grub.io-public and root directory)
 ├── expo-env.d.ts                 # ts declaration for expo environment vars 
 └── tsconfig.json                 # ts compiler stuff
```

---

## Building My Project

### Prereqs
- Node.js 
- npm 
- Expo CLI
- Firebase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/amukh0/grub.io.git
cd grub.io
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase**
   - Create a Firebase project
   - Enable Email Authentication, Database, and Storage
      - Note: paid Firebase account is needed for storage
   - Create your own `src/firebase.ts` and copy `src/firebase.template.ts` into it, complete template accordingly

4. **Configure Firestore Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // events collection
    match /events/{eventId} {
      // anyone authenticated can create events
      allow create: if request.auth != null;
      
      // allow reading any event if authenticated (needed for join code lookup)
      allow read: if request.auth != null;
      
      // allow updates if authenticated
      allow update: if request.auth != null;
      
      // posts within events
      match /posts/{postId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow update: if request.auth != null;
        allow delete: if request.auth != null;
      }
    }
    
    // users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    
    // notifications
    match /notifications/{notificationId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```
5. **Optional: Create firestoreListeners.ts**
This is a short file I made that stores a registry of listeners to explicitly clear them before logging out. While it is not necessary, building the app without it will probably cause permission errors when you logout. 

6. **Run the app**
```bash
npx expo start
```

---

## Future Plans

- Push notifications (when app is closed)
- Geolocation for food posts
- Built-in chat between food posters & claimers 
- Location-based integration with food waste organizations
- Carbon footprint reduction calculations

---

## Author & Disclosures

**Author**: Anshu Mukherjee
**Date**: [10/28/25]
**AI USE**: AI (Github Copilot) was used to assist with debugging authentication & routing errors by creating console logging for thes. Console logging (and all AI-generated code) was subsequently removed before publication to Github.
