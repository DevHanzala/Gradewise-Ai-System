import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

// Your Firebase configuration
// Replace these values with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD2Hi7Rg3FCbxPvRqgPcMdZw4Hnws3hb1o",
  authDomain: "gradewise-ai-a0d36.firebaseapp.com",
  projectId: "gradewise-ai-a0d36",
  storageBucket: "gradewise-ai-a0d36.firebasestorage.app",
  messagingSenderId: "666877093484",
  appId: "1:666877093484:web:2bd413a0cb51b31f841a49",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth
export const auth = getAuth(app)

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: "select_account",
})

export default app
