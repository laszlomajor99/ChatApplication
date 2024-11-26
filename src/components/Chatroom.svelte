<script>
    import { auth } from "../firebaseConfig";
    import { db } from "../firebaseConfig";
    import { doc, increment,  updateDoc, setDoc, deleteDoc, collection, addDoc, getDoc, onSnapshot, query, orderBy, where } from "firebase/firestore";
    import { onMount, onDestroy } from "svelte";
    import { afterUpdate, tick } from "svelte";
    import Settings from './Settings.svelte';
    import ChangeChatroom from "./ChangeChatroom.svelte";
    import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from "firebase/storage";
    import UploadToast from "./uploadToast.svelte";



let userNicknames = {};
let selectedFile = null;
let userNickname = "";



let uploadProgress = 0;
let isUploading = false;
let uploadingFileName = '';

let unsubscribeUsers;

onMount(() => {
    const usersRef = collection(db, 'users');
    unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const userData = change.doc.data();
          userNicknames[change.doc.id] = {
            nickname: userData.nickname || '',
            profilePicture: userData.profilePicture || ''
          };
        }
        if (change.type === 'removed') {
          delete userNicknames[change.doc.id];
        }
      });
      userNicknames = { ...userNicknames }; // Trigger reactivity
      loadMessages();
    });
  });

onDestroy(() => {
    if (unsubscribeUsers) {
      unsubscribeUsers();
    }
  });

  function handleFileSelect(event) {
  selectedFile = event.target.files[0];
  if (selectedFile) {
    const maxSizeInBytes = 2 * 1024 * 1024; // 2 MB
    if (selectedFile.size > maxSizeInBytes) {
      alert("File size exceeds 2 MB limit. Please choose a smaller file.");
      event.target.value = ''; // Clear the file input
      selectedFile = null;
    } else {
      uploadFile();
    }
  }
}

const fileRefsCollection = collection(db, "fileReferences");

async function uploadFile() {
  if (!selectedFile) return;

  const storage = getStorage();
  const filePath = 'chat_files/' + selectedFile.name;
  const storageRef = ref(storage, filePath);
  const fileId = crypto.randomUUID(); // Generate a unique ID for the file reference

  isUploading = true;
  uploadingFileName = selectedFile.name;

  try {
    const fileRefDoc = doc(fileRefsCollection, fileId);
    const fileRefSnapshot = await getDoc(fileRefDoc);

    let downloadURL;

    if (fileRefSnapshot.exists()) {
      await updateDoc(fileRefDoc, { refCount: increment(1) });
      downloadURL = fileRefSnapshot.data().downloadURL;
    } else {
      const snapshot = await uploadBytesResumable(storageRef, selectedFile);
      downloadURL = await getDownloadURL(snapshot.ref);
      await setDoc(fileRefDoc, { refCount: 1, downloadURL, filePath });
    }

    // Send a message with the file link
    await addDoc(messageRef, {
      text: `File: ${selectedFile.name}`,
      fileURL: downloadURL,
      filePath: filePath,
      fileType: selectedFile.type,
      isImage: selectedFile.type.startsWith('image/'),
      user: user,
      userId: auth.currentUser.uid,
      timestamp: new Date(),
      associatedChatroom: chatroomName,
    });

    selectedFile = null;
    isUploading = false;
    
    // Reset the file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.value = '';
    }

  } catch (error) {
    console.error("Error uploading file:", error);
    isUploading = false;
  }
}    
  async function fetchNicknames(messages) {
    const uniqueUserIds = [...new Set(messages.map(m => m.userId))].filter(id => id && typeof id === 'string');
    for (const userId of uniqueUserIds) {
      if (!userNicknames[userId]) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userNicknames[userId] = userData.nickname || '';
          // Add profilePicture directly to the user object
          userNicknames[userId] = {
            nickname: userData.nickname || '',
            profilePicture: userData.profilePicture || ''
          };
        }
      }
    }
    userNicknames = { ...userNicknames }; // Trigger reactivity

    console.log("userNicknames:", userNicknames);
  }


  $: {
    if (messages.length > 0) {
      fetchNicknames(messages);
    }
  }

    //Handle to logout
    const handleLogout = async () => {
            try {
                await auth.signOut();
                console.log("user is logged out");
            } catch (error) {
                console.error("Logout error:", error.message);
            }
        };
    
        function logoutkeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          handleLogout();
        }
      }

    //when the component load - make sure that messages load as well 
    onMount(async() => {
        loadMessages();
        await loadUserSettings();
        console.log("The Chat room is mounted and the messages were loaded in.");
    });

    // Load user settings from Firestore
    async function loadUserSettings() {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      userNickname = data.nickname || "";
    }
  }

    

      //implement the simple chat application: 
      let myUser = auth.currentUser.displayName 
    let user = myUser; // Set user to the current user initiall


      console.log("this is the user:", user)

      let messages = [];
      let newMessage = "";
      let chatContainer;

      // Firesotre collection referance: 
    export const messageRef = collection(db, "chatMessages")

      // Fetch messages: 
      const loadMessages = () => {
        const q = query(
            messageRef,
            where("associatedChatroom", "==", chatroomName), 
            orderBy("timestamp", "asc")); //Order by timestamp 
        onSnapshot(q, (snapshot) => {
            messages  = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() }))
      }) 
      }

      // Send new message

      const sendMessage = async () => {
        if (newMessage.trim() === "") return; // This prevents emty messages 

        try {
            await addDoc(messageRef, {
                text: newMessage,
                user: user,
                userId: auth.currentUser.uid,
                timestamp: new Date(),
                associatedChatroom: chatroomName,
            });
            newMessage = ""; // Clear the input after sending the message 
            loadMessages()
            scrollToBottom(newMessage)
        } catch (error) {
            console.log("error sending message:", error.message);
        }
      };

      // Detect Enter to send message 
      const handleKeydown = (event) => {
        if (event.key === "Enter") {
            sendMessage();
        }
      };

       // Scroll to bottom of the chat container
  const scrollToBottom = async () => {
    await tick(); // Wait for DOM to update
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Scroll to the bottom after messages are updated
  afterUpdate(() => {
    scrollToBottom();
  });


  export let chatroomName = "General Chatroom";

  function handleChatroomChange(event) {
    chatroomName = event.detail;

    loadMessages()
  }
     
    //Edit messages 
    let editingMessageId = null;
    let editedMessage = "";

    const startEditing = (message) => {
        if (user === message.user) {
            editingMessageId = message.id;
            editedMessage = message.text;
        }
    };

    const handleEditKeydown = async (event, messageId) => {
        if (event.key === "Enter") {
            await updateMessage(messageId);
        } else if (event.key === "Escape") {
            editingMessageId = null;
        }
    };
      const updateMessage = async (messageId) => {
          if (editedMessage.trim() === "") return;

          try {
              const messageDoc = doc(db, "chatMessages", messageId);
              await updateDoc(messageDoc, {
                  text: editedMessage
              });
              editingMessageId = null;
          } catch (error) {
              console.error("Error updating message:", error);
          }
      };


const deleteMessage = async (messageId) => {
  try {
    const messageDoc = doc(db, "chatMessages", messageId);
    const messageSnapshot = await getDoc(messageDoc);
    const messageData = messageSnapshot.data();

    if (messageData.fileURL) {
      const storage = getStorage();
      const fileRef = ref(storage, messageData.fileURL);
      
      try {
        await deleteObject(fileRef);
        console.log("File deleted successfully from storage");
      } catch (error) {
        console.error("Error deleting file from storage:", error);
      }
    }

    await deleteDoc(messageDoc);
    editingMessageId = null;
    console.log("Message and associated file (if any) deleted successfully");
  } catch (error) {
    console.error("Error deleting message:", error);
  }
};


    let isSettingsOpen = false;

    function toggleSettings() {
        isSettingsOpen = !isSettingsOpen;
    }

    let isChangeChatroomOpen = false;

    function toggleChangeChatroom() {
        isChangeChatroomOpen = !isChangeChatroomOpen;

        console.log("isChangeChatroomOpen:", isChangeChatroomOpen);
    }

</script>
    
<div class="chat-container">
        <div class="chat-header">
            <p class="chatroom-name">{chatroomName}</p>

            <button class="change-chatroom" on:click={toggleChangeChatroom}>Change Chatroom</button>

<!-- Settings SVG 
<img class="settings-icon" src="/img/settings.svg" alt="Settings" on:click={toggleSettings} /> 
-->
<svg class="settings-icon" alt="Settings" on:click={toggleSettings}
width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M12 8.25C9.92894 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92894 15.75 12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25ZM9.75 12C9.75 10.7574 10.7574 9.75 12 9.75C13.2426 9.75 14.25 10.7574 14.25 12C14.25 13.2426 13.2426 14.25 12 14.25C10.7574 14.25 9.75 13.2426 9.75 12Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M11.9747 1.25C11.5303 1.24999 11.1592 1.24999 10.8546 1.27077C10.5375 1.29241 10.238 1.33905 9.94761 1.45933C9.27379 1.73844 8.73843 2.27379 8.45932 2.94762C8.31402 3.29842 8.27467 3.66812 8.25964 4.06996C8.24756 4.39299 8.08454 4.66251 7.84395 4.80141C7.60337 4.94031 7.28845 4.94673 7.00266 4.79568C6.64714 4.60777 6.30729 4.45699 5.93083 4.40743C5.20773 4.31223 4.47642 4.50819 3.89779 4.95219C3.64843 5.14353 3.45827 5.3796 3.28099 5.6434C3.11068 5.89681 2.92517 6.21815 2.70294 6.60307L2.67769 6.64681C2.45545 7.03172 2.26993 7.35304 2.13562 7.62723C1.99581 7.91267 1.88644 8.19539 1.84541 8.50701C1.75021 9.23012 1.94617 9.96142 2.39016 10.5401C2.62128 10.8412 2.92173 11.0602 3.26217 11.2741C3.53595 11.4461 3.68788 11.7221 3.68786 12C3.68785 12.2778 3.53592 12.5538 3.26217 12.7258C2.92169 12.9397 2.62121 13.1587 2.39007 13.4599C1.94607 14.0385 1.75012 14.7698 1.84531 15.4929C1.88634 15.8045 1.99571 16.0873 2.13552 16.3727C2.26983 16.6469 2.45535 16.9682 2.67758 17.3531L2.70284 17.3969C2.92507 17.7818 3.11058 18.1031 3.28089 18.3565C3.45817 18.6203 3.64833 18.8564 3.89769 19.0477C4.47632 19.4917 5.20763 19.6877 5.93073 19.5925C6.30717 19.5429 6.647 19.3922 7.0025 19.2043C7.28833 19.0532 7.60329 19.0596 7.8439 19.1986C8.08452 19.3375 8.24756 19.607 8.25964 19.9301C8.27467 20.3319 8.31403 20.7016 8.45932 21.0524C8.73843 21.7262 9.27379 22.2616 9.94761 22.5407C10.238 22.661 10.5375 22.7076 10.8546 22.7292C11.1592 22.75 11.5303 22.75 11.9747 22.75H12.0252C12.4697 22.75 12.8407 22.75 13.1454 22.7292C13.4625 22.7076 13.762 22.661 14.0524 22.5407C14.7262 22.2616 15.2616 21.7262 15.5407 21.0524C15.686 20.7016 15.7253 20.3319 15.7403 19.93C15.7524 19.607 15.9154 19.3375 16.156 19.1985C16.3966 19.0596 16.7116 19.0532 16.9974 19.2042C17.3529 19.3921 17.6927 19.5429 18.0692 19.5924C18.7923 19.6876 19.5236 19.4917 20.1022 19.0477C20.3516 18.8563 20.5417 18.6203 20.719 18.3565C20.8893 18.1031 21.0748 17.7818 21.297 17.3969L21.3223 17.3531C21.5445 16.9682 21.7301 16.6468 21.8644 16.3726C22.0042 16.0872 22.1135 15.8045 22.1546 15.4929C22.2498 14.7697 22.0538 14.0384 21.6098 13.4598C21.3787 13.1586 21.0782 12.9397 20.7378 12.7258C20.464 12.5538 20.3121 12.2778 20.3121 11.9999C20.3121 11.7221 20.464 11.4462 20.7377 11.2742C21.0783 11.0603 21.3788 10.8414 21.6099 10.5401C22.0539 9.96149 22.2499 9.23019 22.1547 8.50708C22.1136 8.19546 22.0043 7.91274 21.8645 7.6273C21.7302 7.35313 21.5447 7.03183 21.3224 6.64695L21.2972 6.60318C21.0749 6.21825 20.8894 5.89688 20.7191 5.64347C20.5418 5.37967 20.3517 5.1436 20.1023 4.95225C19.5237 4.50826 18.7924 4.3123 18.0692 4.4075C17.6928 4.45706 17.353 4.60782 16.9975 4.79572C16.7117 4.94679 16.3967 4.94036 16.1561 4.80144C15.9155 4.66253 15.7524 4.39297 15.7403 4.06991C15.7253 3.66808 15.686 3.2984 15.5407 2.94762C15.2616 2.27379 14.7262 1.73844 14.0524 1.45933C13.762 1.33905 13.4625 1.29241 13.1454 1.27077C12.8407 1.24999 12.4697 1.24999 12.0252 1.25H11.9747ZM10.5216 2.84515C10.5988 2.81319 10.716 2.78372 10.9567 2.76729C11.2042 2.75041 11.5238 2.75 12 2.75C12.4762 2.75 12.7958 2.75041 13.0432 2.76729C13.284 2.78372 13.4012 2.81319 13.4783 2.84515C13.7846 2.97202 14.028 3.21536 14.1548 3.52165C14.1949 3.61826 14.228 3.76887 14.2414 4.12597C14.271 4.91835 14.68 5.68129 15.4061 6.10048C16.1321 6.51968 16.9974 6.4924 17.6984 6.12188C18.0143 5.9549 18.1614 5.90832 18.265 5.89467C18.5937 5.8514 18.9261 5.94047 19.1891 6.14228C19.2554 6.19312 19.3395 6.27989 19.4741 6.48016C19.6125 6.68603 19.7726 6.9626 20.0107 7.375C20.2488 7.78741 20.4083 8.06438 20.5174 8.28713C20.6235 8.50382 20.6566 8.62007 20.6675 8.70287C20.7108 9.03155 20.6217 9.36397 20.4199 9.62698C20.3562 9.70995 20.2424 9.81399 19.9397 10.0041C19.2684 10.426 18.8122 11.1616 18.8121 11.9999C18.8121 12.8383 19.2683 13.574 19.9397 13.9959C20.2423 14.186 20.3561 14.29 20.4198 14.373C20.6216 14.636 20.7107 14.9684 20.6674 15.2971C20.6565 15.3799 20.6234 15.4961 20.5173 15.7128C20.4082 15.9355 20.2487 16.2125 20.0106 16.6249C19.7725 17.0373 19.6124 17.3139 19.474 17.5198C19.3394 17.72 19.2553 17.8068 19.189 17.8576C18.926 18.0595 18.5936 18.1485 18.2649 18.1053C18.1613 18.0916 18.0142 18.045 17.6983 17.8781C16.9973 17.5075 16.132 17.4803 15.4059 17.8995C14.68 18.3187 14.271 19.0816 14.2414 19.874C14.228 20.2311 14.1949 20.3817 14.1548 20.4784C14.028 20.7846 13.7846 21.028 13.4783 21.1549C13.4012 21.1868 13.284 21.2163 13.0432 21.2327C12.7958 21.2496 12.4762 21.25 12 21.25C11.5238 21.25 11.2042 21.2496 10.9567 21.2327C10.716 21.2163 10.5988 21.1868 10.5216 21.1549C10.2154 21.028 9.97201 20.7846 9.84514 20.4784C9.80512 20.3817 9.77195 20.2311 9.75859 19.874C9.72896 19.0817 9.31997 18.3187 8.5939 17.8995C7.86784 17.4803 7.00262 17.5076 6.30158 17.8781C5.98565 18.0451 5.83863 18.0917 5.73495 18.1053C5.40626 18.1486 5.07385 18.0595 4.81084 17.8577C4.74458 17.8069 4.66045 17.7201 4.52586 17.5198C4.38751 17.314 4.22736 17.0374 3.98926 16.625C3.75115 16.2126 3.59171 15.9356 3.4826 15.7129C3.37646 15.4962 3.34338 15.3799 3.33248 15.2971C3.28921 14.9684 3.37828 14.636 3.5801 14.373C3.64376 14.2901 3.75761 14.186 4.0602 13.9959C4.73158 13.5741 5.18782 12.8384 5.18786 12.0001C5.18791 11.1616 4.73165 10.4259 4.06021 10.004C3.75769 9.81389 3.64385 9.70987 3.58019 9.62691C3.37838 9.3639 3.28931 9.03149 3.33258 8.7028C3.34348 8.62001 3.37656 8.50375 3.4827 8.28707C3.59181 8.06431 3.75125 7.78734 3.98935 7.37493C4.22746 6.96253 4.3876 6.68596 4.52596 6.48009C4.66055 6.27983 4.74468 6.19305 4.81093 6.14222C5.07395 5.9404 5.40636 5.85133 5.73504 5.8946C5.83873 5.90825 5.98576 5.95483 6.30173 6.12184C7.00273 6.49235 7.86791 6.51962 8.59394 6.10045C9.31998 5.68128 9.72896 4.91837 9.75859 4.12602C9.77195 3.76889 9.80512 3.61827 9.84514 3.52165C9.97201 3.21536 10.2154 2.97202 10.5216 2.84515Z" fill="currentColor"/>
</svg>
 

<!-- logout SVG
<img on:click={handleLogout} on:keydown={logoutkeydown} class="logout" src="/img/logout.svg" alt="Log Out" />
-->

<svg on:click={handleLogout} on:keydown={logoutkeydown} class="logout" alt="Log Out"
width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Interface / Log_Out">
  <path id="Vector" d="M12 15L15 12M15 12L12 9M15 12H4M9 7.24859V7.2002C9 6.08009 9 5.51962 9.21799 5.0918C9.40973 4.71547 9.71547 4.40973 10.0918 4.21799C10.5196 4 11.0801 4 12.2002 4H16.8002C17.9203 4 18.4796 4 18.9074 4.21799C19.2837 4.40973 19.5905 4.71547 19.7822 5.0918C20 5.5192 20 6.07899 20 7.19691V16.8036C20 17.9215 20 18.4805 19.7822 18.9079C19.5905 19.2842 19.2837 19.5905 18.9074 19.7822C18.48 20 17.921 20 16.8031 20H12.1969C11.079 20 10.5192 20 10.0918 19.7822C9.71547 19.5905 9.40973 19.2839 9.21799 18.9076C9 18.4798 9 17.9201 9 16.8V16.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>




        </div>
    <!-- Display chat messages -->
    <div class="chat-messages" bind:this={chatContainer}>
        {#each messages as message (message.id)}
        <div class={`${message.userId === auth.currentUser.uid ? 'my-message' : 'other-message'} ${editingMessageId === message.id ? 'editing' : ''}`}
         on:dblclick={() => message.userId === auth.currentUser.uid && startEditing(message)}>
         <li><strong>{userNicknames[message.userId]?.nickname || message.user || "Mysterious New User"}:</strong></li>

          <br>
                {#if editingMessageId === message.id}
                    <input class="edit-input"
                           bind:value={editedMessage} 
                           on:keydown={(e) => handleEditKeydown(e, message.id)} />
                    <button class="edit-button" on:click={() => updateMessage(message.id)}>


                      
<!--edit SVG
<img src="/img/edit.svg.svg" alt="Save edit">
-->
<svg class="edit-button-svg" alt="Save edit" fill="currentColor" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 612.001 612.001" xml:space="preserve">
<path d="M591.86,179.158L432.915,20.212c33.164-33.164,95.625-24.465,139.517,19.426C616.325,83.532,625.026,145.993,591.86,179.158
	z M462.818,84.489l-47.094-47.094L80.181,372.939l47.094,47.094L462.818,84.489z M509.918,131.591l-29.434-29.435L144.939,437.702
	l29.434,29.435L509.918,131.591z M192.03,484.789l47.094,47.094l335.544-335.544l-47.094-47.094L192.03,484.789z M25.219,517.021
	c2.26,17.493,10.2,33.998,23.018,46.814c12.819,12.819,29.32,20.759,46.816,23.016l127.422-38.312L63.53,389.597L25.219,517.021z
	 M12.882,558.053L0.513,599.198l0.004,0.004c-1.016,3.117-0.671,6.378,2.289,9.337c2.96,2.958,6.947,4.031,10.064,3.016l0.005,0.005
	l41.18-12.382c-8.5-4.723-16.423-10.626-23.48-17.682C23.524,574.446,17.602,566.544,12.882,558.053z"/>
</svg>

                    </button>
                    <button class="delete-button" on:click={() => deleteMessage(message.id)}>
<!--Delete SVG 
<img src="/img/delete.svg" alt="Delete message">
-->  

<svg class="delete-button-svg" width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>


                    </button>
                {:else}
                    {#if message.fileURL}
                        {#if message.isImage}
                        <li>
                            <img src={message.fileURL} alt={message.text} style="max-width: 200px; max-height: 200px;" />
                            <br>
                            <a  href={message.fileURL} target="_blank" class="file-link">Download {message.text}</a>
                        </li>
                        {:else}
                        <li><a href={message.fileURL} target="_blank" class="file-link">{message.text}</a></li>
                        {/if}
                    {:else}
                        <li>{message.text}</li>
                    {/if}
                {/if}

                {#if userNicknames[message.userId]?.profilePicture}
                <img
                    src={userNicknames[message.userId].profilePicture}
                    alt="Profile"
                    class="profile-picture"
                />
                {/if}

            </div>
        {/each}

    </div>
  <!-- Input for sending a message -->
  <div class="footer">
    <input class="chat-input-field"
      type="text" 
      bind:value={newMessage} 
      on:keydown={handleKeydown} 
      placeholder="Type your message..." />
      <div>

        <input type="file" id="file-input" style="display: none;" on:change={handleFileSelect} />
        <button class="attach-file" on:click={() => document.getElementById('file-input').click()}>🔗</button>

    <button class="Send-chat-button" on:click={sendMessage}>Send <!-- <img class="send-message-img" src="/img/sendmessage.svg" alt=">"> --></button>

    </div>
  </div>
  <Settings bind:isOpen={isSettingsOpen}/>

  <ChangeChatroom bind:isOpen={isChangeChatroomOpen} on:chatroomChange={handleChatroomChange} />

  <UploadToast isOpen={isUploading} progress={uploadProgress} fileName={uploadingFileName} />


</div>
<style>
@import "../Styles.css";

.settings-icon,
.logout,
.delete-button-svg,
.edit-button-svg {
  color: var(--tertiary-color);
}

.chatroom-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px; /* Adjust this value based on your needs */
    }


.profile-picture {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--primary-color);
  }

a {
    color: var(--tertiary-color);
    text-decoration: none;
    font-weight: bold;
    transition: color 0.3s ease;
  }
  a:hover {
    color: var(--accent-color);
    text-decoration: underline;
  }

  .file-link {
    display: inline-block;
    margin-top: 5px;
    padding: 5px 10px;
    background-color: var(--tertiary-color-transparent);
    border-radius: 5px;
    font-size: 0.9em;
  }

  .file-link:hover {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
  }


p {
    font: var(--h2);
    color: var(--accent-color);
  }

.delete-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        margin-left: 5px;
        vertical-align: middle;
    }

    .delete-button-svg {
        width: 23px;
        height: 23px;
    }

    .edit-input {
        width: 88%;
        background-color: transparent;
        border: none;
        border-bottom: 1px solid var(--tertiary-color);
        font-size: 1rem;
        color: inherit;
        padding: 2px 0;
        margin-top: 2px;
    }

    .edit-input:focus {
        outline: none;
        border-bottom: 2px solid var(--tertiary-color);
    }

    .editing {
        background-color: var(--tertiary-color-transparent);
    }

    .edit-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        margin-left: 5px;
        vertical-align: middle;
    }

    .edit-button-svg {
        width: 20px;
        height: 20px;
    }

    p {
        color: var(--color-secondary);
    }

    li {
        list-style-type: none; 
        margin: 0;             
        padding: 0;  
        display: inline; 
    }

    .settings-icon {
        position: absolute;
        right: 3rem;
        width: 5%;
        align-self: center;
        cursor: pointer;
    }

    
    
    .logout {
        position: absolute;
        right: 1rem;
        width: 5%;
        align-self: center;
        cursor: pointer;
    }

    .change-chatroom {
        position: absolute;
        right: 5.2rem;
        padding: 0.5rem;
        border-radius: 5px;
        background-color: var(--tertiary-color);
        border: none;
        color: var(--primary-color);
        font-size: 1rem;
    }

    .change-chatroom:hover {
        cursor: pointer;
        background-color: var(--tertiary-color-transparent)
    }

    .chat-container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 98vh;
        max-width: 600px;
        margin: 0 auto;
    }

    .chat-header {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        background-color: var(--primary-color);
        font: var(--p);
        color: var(--secondary-color);
    }
    .chat-messages {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
	    background-color: var(--ligher-primary-color);
    
        font: var(--p);
        color: var(--secondary-color);
    }
    .my-message {
        position: relative;
        margin-bottom: 10px;
        padding: 5px;
        background-color: var(--tertiary-color-transparent);
        border-radius: 5px;
        font: var(--p);
        color: var(--secondary-color);
    }

    .other-message {
        position: relative;
        margin-bottom: 10px;
        padding: 5px;
        background-color: var(--accent-color-transparent);
        border-radius: 5px;
        font: var(--p);
        color: var(--secondary-color);
    }
    .footer {
        position: relative;
        display: flex;
        padding: 12px;
        background-color: var(--primary-color);
    }

    .chat-input-field {
        /*
        background-color: var(--primary-color);
        border: 3px solid var(--tertiary-color);
        border-radius: 5px;
        font-size: 1rem;
        font-weight: 700;
        height: 2rem;
        font: var(--p);
        color: var(--secondary-color);        
        width: 74.5%;
        */

        flex-grow: 1;

        border: 3px solid var(--tertiary-color);
        border-radius: 5px;
        
        color: var(--secondary-color);
        background-color: var(--primary-color);
        font: var(--p);
        height: 40px;
    }

    .Send-chat-button {
        /*position: absolute;
        align-items: center;
        align-content: center;
        right: 1rem;
        height: 39px;
        border-radius: 5px;
        background-color: var(--primary-color);
        border: none;
        color: var(--tertiary-color);
        border: 3px solid var(--tertiary-color);
        font-size: 1rem;
        font-weight:700;
        width: 8rem;
        box-sizing: border-box;
        */

        background-color: var(--tertiary-color);
        color: var(--primary-color);
        

        padding: 0.7rem 1.2rem;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font: var(--p);
        transition: background-color 0.3s, color 0.3s;

        
    }

    .Send-chat-button:hover, .attach-file:hover {
        opacity: 0.9;
    }

    .attach-file {
        background-color: var(--tertiary-color);
        color: var(--primary-color);
        

        padding: 0.7rem 1.2rem;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font: var(--p);
        transition: background-color 0.3s, color 0.3s;

        margin-left: 4px;

    }
   
    .message-text {
    word-wrap: break-word;
  }



 /* Styling the scrollbar */

 .chat-messages::-webkit-scrollbar {
    width: 8px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: var(--primary-color);
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: var(--tertiary-color);
    border-radius: 4px;
  }

</style>