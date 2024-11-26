<script>
    import GoogleSingIn from "./components/GoogleSingIn.svelte";
	import Chatroom from "./components/Chatroom.svelte";
	

	import { auth } from "./firebaseConfig";
	import { onAuthStateChanged } from "firebase/auth";
    import EmailSignIn from "./components/EmailSignIn.svelte";
	let user = null;

	//listen for Auth state change

	onAuthStateChanged(auth, (firebaseUser) => {
		if (firebaseUser) {
			user = firebaseUser; //user is signed in 
		} else {
			user = null //user in not signed in 
		}
	});

	

	
</script>

<main>

<div class="appcard">
	{#if user}
	
		<Chatroom/>
	
	{:else} 
		<div id="log-in-page">

		<EmailSignIn/>
		</div>
		

	{/if}


</div>

</main>

<style>
	@import "/src/Styles.css";
	/*.appcard {
		
		margin: 0 auto;
		
	}*/

	/*
	main {
		background: var(--color-primary);

		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		height: 100%;
		max-width: 400px;
		max-height: 600px;
		border: 1px solid var(--color-accent);
		box-shadow: 0px 5px 10px rgba(0, 0, 0, 0.05);
		
		
	
	}*/


	
</style>