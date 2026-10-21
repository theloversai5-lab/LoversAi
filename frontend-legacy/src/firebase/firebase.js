import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/* ✅ Firebase Web Config (yours is correct) */
const firebaseConfig = {
  apiKey: "AIzaSyCs3On77Y_vOe3HOTKfP3kvP-9ZHOHt8kw",
  authDomain: "lovers-ai-65987.firebaseapp.com",
  projectId: "lovers-ai-65987",
  storageBucket: "lovers-ai-65987.firebasestorage.app",
  messagingSenderId: "619082546714",
  appId: "1:619082546714:web:5f749978a8f9a369041ba3",
};

/* ✅ Initialize Firebase */
const app = initializeApp(firebaseConfig);

/* ✅ EXPORT AUTH (THIS WAS MISSING) */
export const auth = getAuth(app);
