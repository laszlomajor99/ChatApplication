<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
  
    export let isOpen = false;
    export let fileName = '';
  
    let showCompletedMessage = false;
  
  
    onMount(() => {
      return () => clearTimeout();
    });
  </script>
  
  {#if isOpen}
    <div class="toast-container" transition:fade={{ duration: 300 }}>
      <div class="toast">
        {#if showCompletedMessage}
          <p>Upload finished!</p>
        {:else}
          <p>{fileName}</p>
          <p>Uploading...</p>
        {/if}
        </div>
    </div>
  {/if}
  
  <style>
    .toast-container {
      position: fixed;
      top: 5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
    }
  
    .toast {
      background-color: var(--primary-color);
      color: var(--secondary-color);
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
  
  </style>
  