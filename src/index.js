
'use strict';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

// -- My addition -- 
import { 
  getDatabase,
  ref,
  set,
  update,
  push,
  onValue,
  serverTimestamp,
  query,
  orderByChild,
  orderByKey,
  orderByValue,
  limitToLast,
  equalTo,
  onDisconnect,
} from 'firebase/database';


import { getFirebaseConfig } from './firebase-config.js';

var recepient_uid = 0;

function setRecepientId(recep_id) {
  recepient_uid = recep_id;
}

// Signs-in Chatter
async function signIn() {
  var provider = new GoogleAuthProvider();
  if(provider){
    await signInWithPopup(getAuth(), provider);
    set(ref(getDatabase(), 'users/' + getUserName()), {
      name: getUserName(),
      profilePicUrl: getProfilePicUrl(),
      uid: getAuth().currentUser.uid,
      online: true,
      on_tab: null,
    });
  }
  loadUsers();
  // loadMessages();
}

// Signs-out of Friendly Chat.
function signOutUser() {
  let username = getUserName();
  signOut(getAuth());

  update(ref(getDatabase(), 'users/' + username), {
    online: false
  });
  location.reload();
}

// Initiate firebase auth
function initFirebaseAuth() {
  onAuthStateChanged(getAuth(), authStateObserver );
}

// Returns the signed-in user's profile Pic URL.
function getProfilePicUrl() {
  return getAuth().currentUser.photoURL || '/imgaes/profile_placeholder.png';
}

// Returns the signed-in user's display name.
function getUserName() {
  return getAuth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!getAuth().currentUser;
}

// Saves a new message on the Realtime dB.
async function saveMessage(messageText) {
  try {
    let newRef = await push(ref(getDatabase(), 'messages/'), {
      name: getUserName(),
      text: messageText,
      profilePicUrl: getProfilePicUrl(),
      timestamp: serverTimestamp(),
      sender_id: getAuth().currentUser.uid,
      receiver_id: recepient_uid,
      sent: false,
      received: false,
      seen: false,
    }).then(newRef => {
      // console.log('New message added successfully!');
      // console.log(newRef);
      update(newRef, {sent:true});
    });
  }
  catch(error) {
    console.error('Error writing new message to Firebase Database', error);
  }
}

// Loads chat messages history and listens for upcoming ones.
function loadMessages(recep_uid) {
  document.getElementById('messages').innerHTML = "";
  setRecepientId(recep_uid);
  const recentMessageQuery = query(ref(getDatabase(), 'messages/'),
                              orderByChild('timestamp'),
                              limitToLast(5));
  // Start listening to the query
  onValue(recentMessageQuery, function(snapshot) {
    snapshot.forEach(function(change) {

        var message = change.val();
        if (message.sender_id == getAuth().currentUser.uid && message.receiver_id == recepient_uid
        || message.sender_id == recepient_uid && message.receiver_id == getAuth().currentUser.uid) {
        displayMessage(change.key, message.timestamp, message.name,
          message.text, message.profilePicUrl, message.sent, message.received, message.seen,
          message.sender_id, message.receiver_id);
        }
    });
  });
}

// Loads Online Users
function loadUsers() {
  // const dbRef = db.ref("users/");

  const onlineUsers = query(ref(getDatabase(), 'users/'), orderByChild("online"), equalTo(true), limitToLast(5));
  // Start listening to the query
  onValue(onlineUsers, function(snapshot) {
    snapshot.forEach(function(change) {

        var user = change.val();
        // console.log(message);
        // console.log(user.uid, null, user.name, user.profilePicUrl);
        if (user.uid != getAuth().currentUser.uid){
        displayUsers(user.uid, change.key, user.name, user.profilePicUrl);
        }
    });
  });

  // dbRef.on("value", snap => {
  //   console.log(snap);
  //   console.log(snap.key);
  // });

  // var loadMessageElements = document.getElementsByTagName('button');
  // console.log(loadMessageElements);
  // var messagesLoadButton = loadMessageElements[1];
  // messagesLoadButton.addEventListener('click', loadMessages(this.id));  
}


// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputElement.value && checkSignedInWithMessage()) {
    saveMessage(messageInputElement.value).then(function () {
      // Clear message text field and re-enable the SEND button.
      resetMaterialTextfield(messageInputElement);
      toggleButton();
    });
  }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) {
    // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage =
      'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

  } else {
    // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}


function createAndInsertMessage(id, timestamp) {
  const container = document.createElement('div');
  container.innerHTML = MESSAGE_TEMPLATE;
  const div = container.firstChild;
  div.setAttribute('id', id);

  // If timestamp is null, assume we've gotten a brand new message.
  // https://stackoverflow.com/a/47781432/4816918
  // timestamp = timestamp;
  if (timestamp) 
  {timestamp = timestamp; } else {
    timestamp = Date.now();
  }
  div.setAttribute('timestamp', timestamp);

  // figure out where to insert new message
  const existingMessages = messageListElement.children;
  if (existingMessages.length === 0) {
    messageListElement.appendChild(div);
  } else {
    let messageListNode = existingMessages[0];

    while (messageListNode) {
      const messageListNodeTime = messageListNode.getAttribute('timestamp');

      if (!messageListNodeTime) {
        throw new Error(
          `Child ${messageListNode.id} has no 'timestamp' attribute`
        );
      }

      if (messageListNodeTime > timestamp) {
        break;
      }

      messageListNode = messageListNode.nextSibling;
    }

    messageListElement.insertBefore(div, messageListNode);
  }

  return div;
}

// Displays a Message in the UI.
function displayMessage(id, timestamp, name, text, picUrl, sent, received, seen,
                        sender, receiver) {
  
  if (receiver == getAuth().currentUser.uid) {
  update(ref(db, 'messages/' + id ), {received: true});
  }
  var div =
    document.getElementById(id) || createAndInsertMessage(id, timestamp);

  // profile picture
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage =
      'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }

  div.querySelector('.name').textContent = name;
  

  // var statusElement = div.querySelector('.status');
  // if (seen == true) {
  //   // statusElement.textContent = '&#10003;'
  // } else if (received == true) {
  //   statusElement.textContent = '\u2713\u2713';
  // } else if (sent == true) {
  //   statusElement.textContent = '\u2713';

    var messageElement = div.querySelector('.message');

    if (text) {
      // If the message is text.
      if (seen) { text += '\t\u2713\u2713'; } else if (received) {text += '\t\u2713\u2713';} else if (sent) {
      text += '\t\u2713';
      }
      messageElement.textContent = text;
      // Replace all line breaks by <br>.
      messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
    }


  // Show the card fading-in and scroll to view the new message.
  setTimeout(function () {
    div.classList.add('visible');
  }, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
  messageInputElement.focus();
}

// Create and Insert Users
function createAndInsertUsers(id, timestamp) {
  const container = document.createElement('div');
  container.innerHTML = USER_TEMPLATE;
  const div = container.firstChild;
  div.setAttribute('id', id);
  const childnodes = div.childNodes;

  childnodes[1].setAttribute('id', id);
  childnodes[1].addEventListener('click', loadMessages(id));

  userListElement.appendChild(div);

  return div;
}

// Displays Users in the UI
function displayUsers(uid, username, name, picUrl) {
  var div =
    document.getElementById(uid) || createAndInsertUsers(uid, username);

  // profile picture
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage =
      'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }

  // div.querySelector('.name').textContent = name;
  var nameElement = div.querySelector('.username');


    // If the message is text.
    nameElement.textContent = name;
    // Replace all line breaks by <br>.
    // nameElement.innerHTML = nameElement.innerHTML.replace(/\n/g, '<br>');
  
  // Show the card fading-in and scroll to view the new message.
    // var loadMessageElements = document.getElementsByClassName('username');
    // // console.log(loadMessageElements);
    //   var messagesLoadButton = loadMessageElements[1];
    //   messagesLoadButton.addEventListener('click', loadMessages(this.id));
  // setTimeout(function () {
  //   div.classList.add('visible');
  // }, 1);
  // userListElement.scrollTop = userListElement.scrollHeight;
  // messageInputElement.focus();
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000,
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// Template for messages.
var MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '</div>';

var USER_TEMPLATE = 
  '<div class="user-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<button class="username" onclick="loadMessages(this.id)"></button>' +
  '<hr>' + 
  '</div>';

// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// A loading image URL.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';



// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
  if (messageInputElement.value) {
    submitButtonElement.removeAttribute('disabled');
  } else {
    submitButtonElement.setAttribute('disabled', 'true');
  }
}

// Shortcuts to DOM Elements.
var messageListElement = document.getElementById('messages');
var messageFormElement = document.getElementById('message-form');
var messageInputElement = document.getElementById('message');
var submitButtonElement = document.getElementById('submit');
var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');
var userListElement = document.getElementById('user-list');


// Saves message on form submit.
messageFormElement.addEventListener('submit', onMessageFormSubmit);
signOutButtonElement.addEventListener('click', signOutUser);
signInButtonElement.addEventListener('click', signIn);

// Toggle for the button.
messageInputElement.addEventListener('keyup', toggleButton);
messageInputElement.addEventListener('change', toggleButton);


const firebaseAppConfig = getFirebaseConfig();
initializeApp(firebaseAppConfig);
const db = getDatabase();
// const dbRefUsers = db.ref('users/');
// const dbRefMessages = ref(db, 'messages/');

// dbRefUsers.on("child_added", snap => {
//   console.log(snap);
// });
// dbRefUsers.on("child_deleted", snap => {
//   console.log(snap);
// });
// dbRefUsers.on("child_changed", snap => {
//   console.log(snap);
// });

// dbRefUsers.on("value", snap => {
//   console.log(snap);
// });

const presentRef = ref(db, 'users/' + getUserName() + 'online');
onDisconnect(presentRef).set(false);

initFirebaseAuth();


// if (checkSignedInWithMessage()) {
// loadMessages();
loadUsers();
// }
