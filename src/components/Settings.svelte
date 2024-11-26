<script>
  import { onMount } from 'svelte';
  import { auth, db } from '../firebaseConfig';
  import { doc, setDoc, getDoc } from 'firebase/firestore';
  import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { sendPasswordResetEmail } from 'firebase/auth';




let profilePicture = '';
let profilePictureFile = null;

onMount(async () => {
    await loadUserSettings();
  });

export let isOpen = false;
let nickname = '';
let showToast = false;

function removeProfilePicture() {
  profilePicture = '';
  profilePictureFile = null;
}

// removed the feature from UI as of now
async function handlePasswordReset() {
  const user = auth.currentUser;
  if (user?.email) {
    await sendPasswordResetEmail(auth, user.email);
    passwordResetToast = true;
    setTimeout(() => {
      passwordResetToast = false;
    }, 1500);
  }
}

async function loadUserSettings() {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      nickname = data.nickname || '';
      hueValue = data.hueValue || 0;
      isDarkMode = data.isDarkMode || false;
      profilePicture = data.profilePicture || '';

      // Apply the loaded settings
      document.documentElement.style.setProperty('--hue', hueValue);
      document.body.classList.toggle('dark', isDarkMode);
    }
  }

  async function saveUserSettings() {

    if (profilePictureFile) {
      const storage = getStorage();
      const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, profilePictureFile);
      profilePicture = await getDownloadURL(storageRef);
    }

    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      nickname,
      hueValue,
      isDarkMode,
      profilePicture,
    });
    console.log('User settings saved:', nickname, hueValue, isDarkMode);

    showToast = true;
      setTimeout(() => {
        showToast = false;
      }, 1500);
  }

  function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (file) {
      profilePictureFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        profilePicture = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
  
  function closeSettings() {
    isOpen = false;
    console.log("Settings closed");
  }
  let hueValue = 0;

  $: {
    document.documentElement.style.setProperty('--hue', hueValue);
    
  }
  let isDarkMode = false;

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    
  }

</script>

{#if isOpen}
  <div class="settings-overlay" on:click={closeSettings}>
    <div class="settings-popup" on:click|stopPropagation>
      <h2>Settings</h2>

      <div class="setting-item">
        <label for="nickname">Nickname</label>
        <input type="text" id="nickname" bind:value={nickname}>
      </div>

      <label for="profile-picture">Progile Picture</label>
      <div class="setting-item profile-picture-section">
        
        {#if profilePicture}
          <img src={profilePicture} alt="Profile" class="profile-preview" />
        {/if}
        <div class="profile-picture-buttons">
          {#if profilePicture}
            <button class="profile-button remove-picture" on:click={removeProfilePicture}>Remove</button>
          {/if}
          <div class="file-input-wrapper">
            <button class="profile-button file-input-button">Choose File</button>
            <input type="file" id="profile-picture" accept="image/*" on:change={handleProfilePictureChange}>
          </div>
        </div>
      </div>
      
      <div class="setting-item">
        <label for="hue-slider">Hue</label>
        <input type="range" id="hue-slider" min="0" max="360" bind:value={hueValue}>
        <input type="number" id="hue-value" min="0" max="360" bind:value={hueValue}>
      </div>

      <div class="setting-item">
        <button class="toggle-button" on:click={toggleDarkMode}>
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>  
      </div>

      <!-- removed the password reset feature for now... 
      {#if auth.currentUser?.providerData[0]?.providerId === 'password'}
        <div class="setting-item">
          <button class="reset-password" on:click={handlePasswordReset}>
            Reset Password
          </button>
        </div>
      {/if} 
      -->


      <button class="save-settings" on:click={saveUserSettings}>Save Settings</button>
      <button class="close-button" on:click={closeSettings}>Close</button>

      
      </div>
  </div>

{/if}

{#if showToast}
      <div class="toast">Setting are saved!</div>
      {/if}


<style>

.reset-password {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
    padding: 0.7rem 1.2rem;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font: var(--p);
    transition: background-color 0.3s, color 0.3s;
  }

  .reset-password:hover {
    opacity: 0.9;
  }



.profile-picture-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.profile-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 50%;
}

.profile-picture-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-button {
  width: 120px;
  padding: 0.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font: var(--p);
  transition: opacity 0.3s;
}

.profile-button:hover {
  opacity: 0.9;
}

.remove-picture {
  background-color: var(--tertiary-color);
  color: var(--primary-color);
}

.file-input-button {
  background-color: var(--accent-color);
  color: var(--primary-color);
}

.file-input-wrapper {
  position: relative;
  overflow: hidden;
  display: inline-block;
}

.file-input-wrapper input[type=file] {
  font-size: 100px;
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  cursor: pointer;
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

.save-settings {
    background-color: var(--accent-color);
    color: var(--primary-color);
    padding: 0.7rem 1.2rem;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font: var(--p);
    transition: background-color 0.3s, color 0.3s;
    margin-top: 1rem;
  }

  .save-settings:hover {
    opacity: 0.9;
  }

input[type="text"] {
    width: 97%;
    padding: 0.5rem;
    border: 2px solid var(--tertiary-color);
    border-radius: 4px;
    font: var(--p);
    color: var(--secondary-color);
    background-color: var(--primary-color);
  }


  .settings-overlay {
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

  .settings-popup {
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

  .setting-item {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font: var(--p);
  }

  input[type="range"] {
    width: 100%;
    margin-bottom: 0.5rem;
  }

  input[type="number"] {
    width: 60px;
    padding: 0.3rem;
    border: 1px solid var(--tertiary-color);
    border-radius: 4px;
    font: var(--p);
    color: var(--secondary-color);
    background-color: var(--pre-primary-color);
  }

  .toggle-button, .close-button {
    padding: 0.7rem 1.2rem;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font: var(--p);
    transition: background-color 0.3s, color 0.3s;
  }

  .toggle-button {
    background-color: var(--accent-color);
    color: var(--primary-color);
  }

  .close-button {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
    margin-top: 1rem;
  }

  .toggle-button:hover, .close-button:hover {
    opacity: 0.9;
  }

  p {
    font: var(--p);
    margin-top: 1rem;
  }
</style>
