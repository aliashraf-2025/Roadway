import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAHVwNiZqN7YYBQm4UJcjXIBruA5cTVRoc",
    authDomain: "a2z-app-3ea59.firebaseapp.com",
    projectId: "a2z-app-3ea59",
    storageBucket: "a2z-app-3ea59.appspot.com",
    messagingSenderId: "923663939425",
    appId: "1:923663939425:web:17661dc93fd2505ef87720",
    measurementId: "G-63EXRMTM4H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
