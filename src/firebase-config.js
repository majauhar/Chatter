/**
 * To find your Firebase config object:
 * 
 * 1. Go to your [Project settings in the Firebase console](https://console.firebase.google.com/project/_/settings/general/)
 * 2. In the "Your apps" card, select the nickname of the app for which you need a config object.
 * 3. Select Config from the Firebase SDK snippet pane.
 * 4. Copy the config object snippet, then add it here.
 */
 const config = {
  apiKey: "AIzaSyBYhVNkFnOn0es_168UlsnytrDHqEVQobs",
  authDomain: "friendlychat-46a8d.firebaseapp.com",
  projectId: "friendlychat-46a8d",
  databaseURL: "https://friendlychat-46a8d-default-rtdb.firebaseio.com/",
  storageBucket: "friendlychat-46a8d.appspot.com",
  messagingSenderId: "842915597954",
  appId: "1:842915597954:web:2532b023627121558f6e9b"
};

export function getFirebaseConfig() {
  if (!config || !config.apiKey) {
    throw new Error('No Firebase configuration object provided.' + '\n' +
    'Add your web app\'s configuration object to firebase-config.js');
  } else {
    return config;
  }
}