<script>
  import { auth } from '../firebaseConfig';
  import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
  import GoogleSingIn from './GoogleSingIn.svelte';
  import { sendPasswordResetEmail } from 'firebase/auth';



  let email = '';
  let password = '';
  let isSignUp = false;
  let errorMessage = '';


function getReadableError(error) {
    switch (error.code) {
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      default:
        return 'An error occurred. Please try again';
    }
  }

  async function handleForgotPassword() {
  if (email) {
    try {
      await sendPasswordResetEmail(auth, email);
      errorMessage = 'Password reset email sent! Check your inbox.';
    } catch (error) {
      errorMessage = getReadableError(error);
    }
  } else {
    errorMessage = 'Please enter your email address first';
  }
}


  async function handleSubmit() {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      errorMessage = getReadableError(error);
    }
  }
</script>


<div class="auth-card">
  <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
  
  <form on:submit|preventDefault={handleSubmit}>
    <input
      type="email"
      placeholder="Email"
      bind:value={email}
      required
    />
    
    <input
      type="password"
      placeholder="Password"
      bind:value={password}
      required
    />

{#if errorMessage}
  <p class="error">{errorMessage}</p>
  {#if !isSignUp}
    <button class="forgot-password" on:click={handleForgotPassword}>
      Forgot Password?
    </button>
  {/if}
{/if}

    <button type="submit">
      {isSignUp ? 'Sign Up' : 'Log In'}
    </button>
  </form>

  {#if !isSignUp}
  <GoogleSingIn />
    {/if}


  <button 
    class="toggle-mode"
    on:click={() => (isSignUp = !isSignUp)}
  >
    {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
  </button>


  
</div>

<style>

.error {
    color: var(--accent-color);
    font: var(--p);
    text-align: center;
    margin: 0;
    padding: 0;
    line-height: 1;
  }

  .forgot-password {
    background: none;
    border: none;
    color: var(--accent-color);
    text-decoration: underline;
    cursor: pointer;
    font: var(--p);
    padding: 0;
    margin-top: 4px;
    line-height: 1;
  }


  .auth-card {
    background-color: var(--primary-color);
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px var(--tertiary-color-transparent);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  h2 {
    font: var(--h1);
    color: var(--secondary-color);
    margin-bottom: 1.5rem;
    text-align: center;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  input {
    padding: 0.8rem;
    border: 2px solid var(--tertiary-color-transparent);
    border-radius: 4px;
    background-color: var(--ligher-primary-color);
    color: var(--secondary-color);
    font: var(--p);
  }

  input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  button {
    background-color: var(--tertiary-color);
    color: var(--primary-color);
    padding: 0.8rem;
    border: none;
    border-radius: 4px;
    font: var(--p);
    cursor: pointer;
    transition: opacity 0.2s;
  }

  button:hover {
    opacity: 0.9;
  }

  .toggle-mode {
    background: none;
    color: var(--accent-color);
    margin-top: 1rem;
    text-decoration: underline;
  }

  .error {
    color: var(--accent-color);
    font: var(--p);
    text-align: center;
  }
</style>
