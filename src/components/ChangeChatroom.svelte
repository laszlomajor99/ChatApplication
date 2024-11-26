<script>
  import { createEventDispatcher } from 'svelte';
  import { db } from "../firebaseConfig";
  import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
  import { onMount } from "svelte";
  import { auth } from "../firebaseConfig";
  import { slide } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  let newChatroomType = 'public';  

  function closeChangeChatroom() {
    isOpen = false;
  }

  let selectedChatroom = '';
  let chatroomList = [];
  let newChatroomName = '';
  let visibleToUsers = '';

  let newEmail = '';
  let invitedUsers = [];

  let mode = 'select';
  let popupTitle = 'Change Chatroom';
  let showToast = false;

function toggleMode() {
    mode = mode === 'select' ? 'create' : 'select';
    popupTitle = mode === 'select' ? 'Change Chatroom' : 'Create New Chatroom';
  }

function addUser() {
  if (newEmail && !invitedUsers.includes(newEmail)) {
      invitedUsers = [...invitedUsers, newEmail];
      newEmail = '';
  }
}
function removeUser(email) {
    invitedUsers = invitedUsers.filter(user => user !== email);
  }


  const chatroomRef = collection(db, "chatrooms");

  onMount(() => {
    loadChatrooms();
  });

  function loadChatrooms() {
  const q = query(chatroomRef);
  onSnapshot(q, (snapshot) => {
    chatroomList = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          name: data.name, 
          deletable: data.deletable,
          type: data.type, 
          visibleTo: data.visibleTo,
          createdByEmail: data.createdByEmail,
          timestamp: data.timestamp
        };
      })
      .filter(chatroom => 
        chatroom.type === 'public' || 
        chatroom.createdByEmail === auth.currentUser.email ||
        chatroom.visibleTo.includes(auth.currentUser.email)
      )
      .sort((a, b) => a.timestamp - b.timestamp); // Sort in ascending order (oldest first)
  });
}

  async function createChatroom() {
    if (newChatroomName.trim() === "") return;

    try {

      await addDoc(chatroomRef, {
        name: newChatroomName,
        deletable: true,
        type: newChatroomType,
        timestamp: new Date(),
        createdBy: auth.currentUser.displayName,
        createdByEmail: auth.currentUser.email,
        visibleTo: newChatroomType === 'private' ? invitedUsers : []
      });
      newChatroomName = '';
      visibleToUsers = '';

      invitedUsers = [];
      mode = 'select';

      showToast = true;
      setTimeout(() => {
        showToast = false;
      }, 1500);

    } catch (error) {
      console.error("Error creating chatroom:", error);
    }
  }

  async function deleteChatroom(chatroomId) {
    try {
      await deleteDoc(doc(db, "chatrooms", chatroomId));
    } catch (error) {
      console.error("Error deleting chatroom:", error);
    }
  }

  function changeChatroom() {
    dispatch('chatroomChange', selectedChatroom);
    closeChangeChatroom();

  }


// toggle the chatroom editing settings: 
let expandedChatroomId = null;

function toggleSettings(chatroomId) {
    expandedChatroomId = expandedChatroomId === chatroomId ? null : chatroomId;
}

// edit chatroom: 

let editingChatroomId = null;
  let editedChatroomName = '';
  let editedInvitedUsers = [];
  let editNewEmail = '';

  function startEditing(chatroom) {
    editingChatroomId = chatroom.id;
    editedChatroomName = chatroom.name;
    editedInvitedUsers = [...chatroom.visibleTo];
  }

  function addEditedUser() {
    if (editNewEmail && !editedInvitedUsers.includes(editNewEmail)) {
      editedInvitedUsers = [...editedInvitedUsers, editNewEmail];
      editNewEmail = '';
    }
  }

  function removeEditedUser(email, creatorEmail) {
    if (email !== creatorEmail) {
      editedInvitedUsers = editedInvitedUsers.filter(user => user !== email);
    }
  }

  async function saveEdits(chatroomId) {
    const chatroomRef = doc(db, "chatrooms", chatroomId);
    await updateDoc(chatroomRef, {
      name: editedChatroomName,
      visibleTo: editedInvitedUsers
    });
    editingChatroomId = null;
  }



  //tooltip code: 
  function handleTooltipPosition(event) {
    const tooltip = event.currentTarget.querySelector('.tooltip');
    const containerWidth = window.innerWidth;
    const iconPosition = event.currentTarget.getBoundingClientRect();
    const centerPoint = containerWidth / 2;

    if (iconPosition.left > centerPoint) {
      tooltip.style.right = '100%';
      tooltip.style.left = 'auto';
      tooltip.style.marginRight = '10px';
    } else {
      tooltip.style.left = '100%';
      tooltip.style.right = 'auto';
      tooltip.style.marginLeft = '10px';
    }
  }


</script>

<!-- 
{#if isOpen}
  <div class="changechatroom-overlay" on:click={closeChangeChatroom}>
    <div class="changechatroom-popup" on:click|stopPropagation>
      <h2>Change Chatroom</h2>



      <div class="chatroom-list">
                {#each chatroomList as chatroom}
                    <div class="chatroom-option">
                    <label>
                        <input type="radio" name="chatroom" value={chatroom.name} bind:group={selectedChatroom}>
                        {chatroom.name}
                    </label>
                    {#if chatroom.deletable}
                        <button class="delete-button" on:click={() => deleteChatroom(chatroom.id)}>
                            <img src="/img/delete.svg" alt="Delete chatroom">
                        </button>
                    {/if}
                    </div>
                {/each}
      </div>

      <div class="chatroom-type">
        <label>
          <input type="radio" name="chatroomType" value="public" bind:group={newChatroomType}>
          Public
        </label>
        <label>
          <input type="radio" name="chatroomType" value="private" bind:group={newChatroomType}>
          Private
        </label>
      </div>


      {#if newChatroomType === 'private'}
      <div class="visible-to">
        <div class="email-input">
          <input type="email" bind:value={newEmail} placeholder="Enter email address">
          <button on:click={addUser}>Add</button>
        </div>
        {#if invitedUsers.length > 0}
          <ul class="invited-users">
            {#each invitedUsers as email}
              <li>
                {email}
                <button on:click={() => removeUser(email)}>Remove</button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      {/if}


      <div class="create-chatroom">
        <input type="text" bind:value={newChatroomName} placeholder="New chatroom name">
        <button on:click={createChatroom}>Create</button>
      </div>
      <button class="change-button" on:click={changeChatroom}>Change</button>
      <button class="close-button" on:click={closeChangeChatroom}>Close</button>
    </div>
  </div>
{/if}
HTML template -->

{#if isOpen}
  <div class="changechatroom-overlay" on:click={closeChangeChatroom}>
    <div class="changechatroom-popup" on:click|stopPropagation>
      <h2>{popupTitle}</h2>
      
      <button class="toggle-button" on:click={toggleMode}>
        {mode === 'select' ? 'Create New Chatroom' : 'Select Existing Chatroom'}
      </button>

      
      {#if mode === 'select'}
        <div class="chatroom-list">
          {#each chatroomList.filter(chatroom => !editingChatroomId || chatroom.id === editingChatroomId) as chatroom}
          <div class="chatroom-option">
            <label class="chatroom-label" class:expanded={expandedChatroomId === chatroom.id}>
              <input type="radio" name="chatroom" value={chatroom.name} bind:group={selectedChatroom}>
              <span class="custom-radio">{chatroom.name}</span>
            </label>
            {#if chatroom.deletable}
            <button class="settings-button" on:click={() => toggleSettings(chatroom.id)}>

<!--Settings SVG
<img src="/img/settings.svg" alt="Settings Button" class="settings-icon">
-->
<svg alt="Settings Button" class="settings-icon" width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M12 8.25C9.92894 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92894 15.75 12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25ZM9.75 12C9.75 10.7574 10.7574 9.75 12 9.75C13.2426 9.75 14.25 10.7574 14.25 12C14.25 13.2426 13.2426 14.25 12 14.25C10.7574 14.25 9.75 13.2426 9.75 12Z" fill="currentColor"/>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.9747 1.25C11.5303 1.24999 11.1592 1.24999 10.8546 1.27077C10.5375 1.29241 10.238 1.33905 9.94761 1.45933C9.27379 1.73844 8.73843 2.27379 8.45932 2.94762C8.31402 3.29842 8.27467 3.66812 8.25964 4.06996C8.24756 4.39299 8.08454 4.66251 7.84395 4.80141C7.60337 4.94031 7.28845 4.94673 7.00266 4.79568C6.64714 4.60777 6.30729 4.45699 5.93083 4.40743C5.20773 4.31223 4.47642 4.50819 3.89779 4.95219C3.64843 5.14353 3.45827 5.3796 3.28099 5.6434C3.11068 5.89681 2.92517 6.21815 2.70294 6.60307L2.67769 6.64681C2.45545 7.03172 2.26993 7.35304 2.13562 7.62723C1.99581 7.91267 1.88644 8.19539 1.84541 8.50701C1.75021 9.23012 1.94617 9.96142 2.39016 10.5401C2.62128 10.8412 2.92173 11.0602 3.26217 11.2741C3.53595 11.4461 3.68788 11.7221 3.68786 12C3.68785 12.2778 3.53592 12.5538 3.26217 12.7258C2.92169 12.9397 2.62121 13.1587 2.39007 13.4599C1.94607 14.0385 1.75012 14.7698 1.84531 15.4929C1.88634 15.8045 1.99571 16.0873 2.13552 16.3727C2.26983 16.6469 2.45535 16.9682 2.67758 17.3531L2.70284 17.3969C2.92507 17.7818 3.11058 18.1031 3.28089 18.3565C3.45817 18.6203 3.64833 18.8564 3.89769 19.0477C4.47632 19.4917 5.20763 19.6877 5.93073 19.5925C6.30717 19.5429 6.647 19.3922 7.0025 19.2043C7.28833 19.0532 7.60329 19.0596 7.8439 19.1986C8.08452 19.3375 8.24756 19.607 8.25964 19.9301C8.27467 20.3319 8.31403 20.7016 8.45932 21.0524C8.73843 21.7262 9.27379 22.2616 9.94761 22.5407C10.238 22.661 10.5375 22.7076 10.8546 22.7292C11.1592 22.75 11.5303 22.75 11.9747 22.75H12.0252C12.4697 22.75 12.8407 22.75 13.1454 22.7292C13.4625 22.7076 13.762 22.661 14.0524 22.5407C14.7262 22.2616 15.2616 21.7262 15.5407 21.0524C15.686 20.7016 15.7253 20.3319 15.7403 19.93C15.7524 19.607 15.9154 19.3375 16.156 19.1985C16.3966 19.0596 16.7116 19.0532 16.9974 19.2042C17.3529 19.3921 17.6927 19.5429 18.0692 19.5924C18.7923 19.6876 19.5236 19.4917 20.1022 19.0477C20.3516 18.8563 20.5417 18.6203 20.719 18.3565C20.8893 18.1031 21.0748 17.7818 21.297 17.3969L21.3223 17.3531C21.5445 16.9682 21.7301 16.6468 21.8644 16.3726C22.0042 16.0872 22.1135 15.8045 22.1546 15.4929C22.2498 14.7697 22.0538 14.0384 21.6098 13.4598C21.3787 13.1586 21.0782 12.9397 20.7378 12.7258C20.464 12.5538 20.3121 12.2778 20.3121 11.9999C20.3121 11.7221 20.464 11.4462 20.7377 11.2742C21.0783 11.0603 21.3788 10.8414 21.6099 10.5401C22.0539 9.96149 22.2499 9.23019 22.1547 8.50708C22.1136 8.19546 22.0043 7.91274 21.8645 7.6273C21.7302 7.35313 21.5447 7.03183 21.3224 6.64695L21.2972 6.60318C21.0749 6.21825 20.8894 5.89688 20.7191 5.64347C20.5418 5.37967 20.3517 5.1436 20.1023 4.95225C19.5237 4.50826 18.7924 4.3123 18.0692 4.4075C17.6928 4.45706 17.353 4.60782 16.9975 4.79572C16.7117 4.94679 16.3967 4.94036 16.1561 4.80144C15.9155 4.66253 15.7524 4.39297 15.7403 4.06991C15.7253 3.66808 15.686 3.2984 15.5407 2.94762C15.2616 2.27379 14.7262 1.73844 14.0524 1.45933C13.762 1.33905 13.4625 1.29241 13.1454 1.27077C12.8407 1.24999 12.4697 1.24999 12.0252 1.25H11.9747ZM10.5216 2.84515C10.5988 2.81319 10.716 2.78372 10.9567 2.76729C11.2042 2.75041 11.5238 2.75 12 2.75C12.4762 2.75 12.7958 2.75041 13.0432 2.76729C13.284 2.78372 13.4012 2.81319 13.4783 2.84515C13.7846 2.97202 14.028 3.21536 14.1548 3.52165C14.1949 3.61826 14.228 3.76887 14.2414 4.12597C14.271 4.91835 14.68 5.68129 15.4061 6.10048C16.1321 6.51968 16.9974 6.4924 17.6984 6.12188C18.0143 5.9549 18.1614 5.90832 18.265 5.89467C18.5937 5.8514 18.9261 5.94047 19.1891 6.14228C19.2554 6.19312 19.3395 6.27989 19.4741 6.48016C19.6125 6.68603 19.7726 6.9626 20.0107 7.375C20.2488 7.78741 20.4083 8.06438 20.5174 8.28713C20.6235 8.50382 20.6566 8.62007 20.6675 8.70287C20.7108 9.03155 20.6217 9.36397 20.4199 9.62698C20.3562 9.70995 20.2424 9.81399 19.9397 10.0041C19.2684 10.426 18.8122 11.1616 18.8121 11.9999C18.8121 12.8383 19.2683 13.574 19.9397 13.9959C20.2423 14.186 20.3561 14.29 20.4198 14.373C20.6216 14.636 20.7107 14.9684 20.6674 15.2971C20.6565 15.3799 20.6234 15.4961 20.5173 15.7128C20.4082 15.9355 20.2487 16.2125 20.0106 16.6249C19.7725 17.0373 19.6124 17.3139 19.474 17.5198C19.3394 17.72 19.2553 17.8068 19.189 17.8576C18.926 18.0595 18.5936 18.1485 18.2649 18.1053C18.1613 18.0916 18.0142 18.045 17.6983 17.8781C16.9973 17.5075 16.132 17.4803 15.4059 17.8995C14.68 18.3187 14.271 19.0816 14.2414 19.874C14.228 20.2311 14.1949 20.3817 14.1548 20.4784C14.028 20.7846 13.7846 21.028 13.4783 21.1549C13.4012 21.1868 13.284 21.2163 13.0432 21.2327C12.7958 21.2496 12.4762 21.25 12 21.25C11.5238 21.25 11.2042 21.2496 10.9567 21.2327C10.716 21.2163 10.5988 21.1868 10.5216 21.1549C10.2154 21.028 9.97201 20.7846 9.84514 20.4784C9.80512 20.3817 9.77195 20.2311 9.75859 19.874C9.72896 19.0817 9.31997 18.3187 8.5939 17.8995C7.86784 17.4803 7.00262 17.5076 6.30158 17.8781C5.98565 18.0451 5.83863 18.0917 5.73495 18.1053C5.40626 18.1486 5.07385 18.0595 4.81084 17.8577C4.74458 17.8069 4.66045 17.7201 4.52586 17.5198C4.38751 17.314 4.22736 17.0374 3.98926 16.625C3.75115 16.2126 3.59171 15.9356 3.4826 15.7129C3.37646 15.4962 3.34338 15.3799 3.33248 15.2971C3.28921 14.9684 3.37828 14.636 3.5801 14.373C3.64376 14.2901 3.75761 14.186 4.0602 13.9959C4.73158 13.5741 5.18782 12.8384 5.18786 12.0001C5.18791 11.1616 4.73165 10.4259 4.06021 10.004C3.75769 9.81389 3.64385 9.70987 3.58019 9.62691C3.37838 9.3639 3.28931 9.03149 3.33258 8.7028C3.34348 8.62001 3.37656 8.50375 3.4827 8.28707C3.59181 8.06431 3.75125 7.78734 3.98935 7.37493C4.22746 6.96253 4.3876 6.68596 4.52596 6.48009C4.66055 6.27983 4.74468 6.19305 4.81093 6.14222C5.07395 5.9404 5.40636 5.85133 5.73504 5.8946C5.83873 5.90825 5.98576 5.95483 6.30173 6.12184C7.00273 6.49235 7.86791 6.51962 8.59394 6.10045C9.31998 5.68128 9.72896 4.91837 9.75859 4.12602C9.77195 3.76889 9.80512 3.61827 9.84514 3.52165C9.97201 3.21536 10.2154 2.97202 10.5216 2.84515Z" fill="currentColor"/>
</svg>

            </button>

            {#if expandedChatroomId === chatroom.id}

            
            <button class="edit-button" on:click={() => startEditing(chatroom)}>

              
<!--edit SVG 
<img src="/img/edit.svg" alt="edit Button" class="edit-icon">
-->
<svg alt="edit Button" class="edit-icon" fill="currentColor" height="800px" width="800px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 612.001 612.001" xml:space="preserve">
<path d="M591.86,179.158L432.915,20.212c33.164-33.164,95.625-24.465,139.517,19.426C616.325,83.532,625.026,145.993,591.86,179.158
	z M462.818,84.489l-47.094-47.094L80.181,372.939l47.094,47.094L462.818,84.489z M509.918,131.591l-29.434-29.435L144.939,437.702
	l29.434,29.435L509.918,131.591z M192.03,484.789l47.094,47.094l335.544-335.544l-47.094-47.094L192.03,484.789z M25.219,517.021
	c2.26,17.493,10.2,33.998,23.018,46.814c12.819,12.819,29.32,20.759,46.816,23.016l127.422-38.312L63.53,389.597L25.219,517.021z
	 M12.882,558.053L0.513,599.198l0.004,0.004c-1.016,3.117-0.671,6.378,2.289,9.337c2.96,2.958,6.947,4.031,10.064,3.016l0.005,0.005
	l41.18-12.382c-8.5-4.723-16.423-10.626-23.48-17.682C23.524,574.446,17.602,566.544,12.882,558.053z"/>
</svg>

            </button>

            <button class="delete-button" on:click={() => deleteChatroom(chatroom.id)}>

<!--Delete SVG
<img src="/img/delete.svg" alt="Delete chatroom">
-->
<svg class="delete-button-svg" alt="Delete chatroom" width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
              
            </button>

          {/if}
            

                {#if chatroom.type === 'private'}
                  <div class="tooltip-container" on:mouseenter={handleTooltipPosition}>

<!--Private icon SVG 
<img src="/img/private.svg" alt="Private Chatroom" class="private-chatroom-icon">
-->
<svg
alt="Private Chatroom" class="private-chatroom-icon"
width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11H5M21.5 11H19M19 11V6C19 4.89543 18.1046 4 17 4H7C5.89543 4 5 4.89543 5 6V11M19 11H5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><circle cx="7" cy="17" r="3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><circle cx="17" cy="17" r="3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M10 16H14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
                    
                    <div class="tooltip">
                      <strong>Members:</strong>
                      <ul>
                        <li>{chatroom.createdByEmail}</li>
                        {#each chatroom.visibleTo as user}
                          <li>{user}</li>
                        {/each}
                      </ul>
                    </div>
                  </div>
                {/if}
            


                {#if editingChatroomId === chatroom.id}
                <div transition:slide>
                  <p>Change Chatroom name:</p>
                  <input 
                    type="text" 
                    bind:value={editedChatroomName} 
                    placeholder="Chatroom name"

                    class="edit-form"
                  >
                  
                  {#if chatroom.type === 'private'}
                    <div class="email-input">
                      <input 
                        type="email" 
                        bind:value={editNewEmail} 
                        placeholder="Add member email"
                      >
                      <button on:click={addEditedUser}>Add</button>
                    </div>
                    
                    <ul class="invited-users">
                      {#each editedInvitedUsers as email}
                        <li>
                          {email}
                          <button 
                            on:click={() => removeEditedUser(email, chatroom.createdByEmail)}
                            disabled={email === chatroom.createdByEmail}
                          >
                            Remove
                          </button>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                  
                  <button class="save-button" on:click={() => saveEdits(chatroom.id)}>Save</button>
                  <button class="cancel-button" on:click={() => editingChatroomId = null}>Cancel</button>
                </div>
              {/if}



            {/if}
            </div>
          {/each}
        </div>
        <button class="change-button" on:click={changeChatroom}>Change</button>
      {:else}
        <div class="chatroom-type">
          <label>
            <input type="radio" name="chatroomType" value="public" bind:group={newChatroomType}>
            Public
          </label>
          <label>
            <input type="radio" name="chatroomType" value="private" bind:group={newChatroomType}>
            Private
          </label>
        </div>

        {#if newChatroomType === 'private'}
          <div class="visible-to">
            <div class="email-input">
              <input type="email" bind:value={newEmail} placeholder="Enter email address">
              <button on:click={addUser}>Add</button>
            </div>
            {#if invitedUsers.length > 0}
              <ul class="invited-users">
                {#each invitedUsers as email}
                  <li>
                    {email}
                    <button on:click={() => removeUser(email)}>Remove</button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}

        <div class="create-chatroom">
          <input type="text" bind:value={newChatroomName} placeholder="New chatroom name">
          <button on:click={createChatroom}>Create</button>
        </div>
      {/if}

      <button class="close-button" on:click={closeChangeChatroom}>Close</button>
    </div>
  </div>
{/if}


{#if showToast}
      <div class="toast">Chatroom created!</div>
      {/if}



<style>

.private-chatroom-icon,
.delete-button-svg,
.edit-icon,
.settings-icon
 {
  color: var(--tertiary-color)
}

 p {
    font: var(--p);
    color: var(--secondary-color);
    margin-bottom: 0.2rem;
  
 } 

.edit-form {
    margin-bottom: 1rem;
    padding: 0.5rem;
    width: 95%;

    border: 1px solid var(--tertiary-color);
    border-radius: 4px;
    font: var(--p);
    color: var(--secondary-color);
    background-color: var(--primary-color);
    margin-bottom: 1rem;
  }

  .edit-actions {
    display: flex;
    gap: 10px;
  }

  .save-button {
    background-color: var(--accent-color);
    color: var(--primary-color);
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font: var(--p);
  }

  .cancel-button {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font: var(--p);
  }

  .save-button:hover,
  .cancel-button:hover {
    opacity: 0.9;
  }




.tooltip-container {
    display: inline-block;
    position: relative;
  }


.tooltip {
    display: none;
    position: absolute;
    background: var(--primary-color);
    border: 1px solid var(--tertiary-color);
    padding: 10px;
    border-radius: 5px;
    z-index: 999;
    min-width: 200px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    top: -50%;
}

.tooltip-container:hover .tooltip {
    display: block;
}

  .tooltip ul {
    list-style: none;
    padding: 0;
    margin: 5px 0 0 0;
  }

  .tooltip li {
    padding: 2px 0;
  }

  .tooltip-container:hover .tooltip {
    display: block;
  }


.toast {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--accent-color);
    color: var(--primary-color);
    padding: 10px 20px;
    border-radius: 5px;
    font: var(--p);
    z-index: 910;
    animation: fadeInOut 1.5s ease-in-out;
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0; }
    10%, 90% { opacity: 1; }
  }
  
.toggle-button {
    display: block;
    width: 100%;
    padding: 0.7rem 1.2rem;
    margin-bottom: 1rem;
    background-color: var(--tertiary-color);
    color: var(--primary-color);
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font: var(--p);
    transition: background-color 0.3s, color 0.3s;
  }

  .toggle-button:hover {
    opacity: 0.9;
  }


.visible-to {
    margin-bottom: 1rem;
  }

  .email-input {
    display: flex;
    margin-bottom: 0.5rem;
  }

  .email-input input {
    flex-grow: 1;
    padding: 0.5rem;
    border: 1px solid var(--tertiary-color);
    border-radius: 4px 0 0 4px;
    font: var(--p);
    color: var(--secondary-color);
    background-color: var(--primary-color);
  }

  .email-input button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0 4px 4px 0;
    background-color: var(--accent-color);
    color: var(--primary-color);
    cursor: pointer;
    font: var(--p);
  }

  .invited-users {
    list-style-type: none;
    padding: 0;
  }

  .invited-users li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background-color: var(--tertiary-color-transparent);
    margin-bottom: 0.5rem;
    border-radius: 4px;
  }

  .invited-users button {
    background-color: var(--accent-color);
    color: var(--primary-color);
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font: var(--p);
  }

.chatroom-type {
    display: flex;
    margin-bottom: 0.5rem;
  }

  .chatroom-type label {
    margin-right: 1rem;
    display: flex;
    align-items: center;
    font: var(--p);
    color: var(--secondary-color);
  }

  .chatroom-type input[type="radio"] {
    margin-right: 0.5rem;
  }


.chatroom-option {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .chatroom-option input[type="radio"] {
    margin-right: 0.5rem;
  }

  .chatroom-option label {
    font: var(--p);
    color: var(--secondary-color);
  }

  .create-chatroom {
    margin-top: 1rem;
    display: flex;
    align-items: center;
  }

  .create-chatroom input {
    flex-grow: 1;
    padding: 0.5rem;
    border: 1px solid var(--tertiary-color);
    border-radius: 4px;
    font: var(--p);
    color: var(--secondary-color);
    background-color: var(--primary-color);
  }

  .create-chatroom button,
  .change-button,
  .close-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font: var(--p);
    transition: background-color 0.3s, color 0.3s;
  }

  .create-chatroom button {
    margin-left: 0.5rem;
    background-color: var(--accent-color);
    color: var(--primary-color);
  }

  .create-chatroom button:hover,
  .change-button:hover,
  .close-button:hover {
    opacity: 0.9;
  }
   
  .chatroom-option {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0.5rem;
  }

  .delete-button, 
  .settings-button, 
  .edit-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;

    align-items: center;
    justify-content: center;

    flex-shrink: 0;

  }

  .delete-button-svg {
    width: 20px;
    height: 20px;

    vertical-align: middle;
  }

  .private-chatroom-icon, 
  .settings-icon, 
  .edit-icon {
    width: 20px;
    height: 20px;

    vertical-align: middle;
  }


  .delete-button, 
  .settings-button, 
  .edit-button,
  .tooltip-container {
    display: inline-block;
    align-items: center;
    flex-shrink: 0;
    margin: 0;
    padding: 0;

    vertical-align: middle;
  }
  

    .changechatroom-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 900;
    }

    .changechatroom-popup {
      background-color: var(--primary-color);
      color: var(--secondary-color);
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      width: 90%;
    }

    h2 {
      font: var(--h1);
      margin-bottom: 1.5rem;
      color: var(--accent-color);
    }

    .chatroom-list {
      margin-bottom: 1.5rem;
    }

    .chatroom-option {
      display: block;
      margin-bottom: 0.5rem;
      font: var(--p);
    }

    .change-button, .close-button {
      padding: 0.7rem 1.2rem;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font: var(--p);
      transition: background-color 0.3s, color 0.3s;
    }

    .change-button {
      background-color: var(--accent-color);
      color: var(--primary-color);
      margin-right: 1rem;
    }

    .close-button {
      background-color: var(--tertiary-color);
      color: var(--primary-color);
    }

    .change-button:hover, .close-button:hover {
      opacity: 0.9;
    }

  .create-chatroom {
    margin-bottom: 1rem;
  }

  .create-chatroom input {
    margin-right: 0.5rem;
  }


  .chatroom-label {
    display: inline-flex;
    width: auto;
    max-width: 85%;
  }

  .chatroom-label.expanded {
    max-width: 70%;
  }

  .chatroom-label input[type="radio"] {
    display: none;
  }

  .custom-radio {
    display: inline-block;
    padding: 5px 10px;
    background-color: var(--tertiary-color-transparent);
    border-radius: 5px;
    font-size: 0.9em;
    color: var(--tertiary-color);
    transition: all 0.3s ease;
  }



  .chatroom-label input[type="radio"]:checked + .custom-radio {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
  }

  .custom-radio:hover {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
    cursor: pointer;
  }



/* should have the ability to scroll */

.changechatroom-popup {
    /* Keep existing styles */
    max-height: 80vh; /* Limits height to 80% of viewport height */
  }

  .chatroom-list {
    max-height: 300px; /* Or any other fixed height */
    overflow-y: auto;
    margin-bottom: 1.5rem;
    padding-right: 10px; /* Prevents content from touching scrollbar */
  }


.chatroom-list::-webkit-scrollbar,
  .invited-users::-webkit-scrollbar {
    width: 8px;
  }

  .chatroom-list::-webkit-scrollbar-track,
  .invited-users::-webkit-scrollbar-track {
    background: var(--primary-color);
  }

  .chatroom-list::-webkit-scrollbar-thumb,
  .invited-users::-webkit-scrollbar-thumb {
    background: var(--tertiary-color);
    border-radius: 4px;
  }



</style>