import admin from "firebase-admin";
admin.initializeApp({ projectId: "lovers-ai-65987" });
console.log("Initialized. Verifying...");
const fakeJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
admin.auth().verifyIdToken(fakeJwt).then(() => console.log("Success")).catch(e => console.log("Error:", e.message));
