// add your imports here
import { initializeApp } from "firebase/app";

// add your firebase config here
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// your constants here
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);