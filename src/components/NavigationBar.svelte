<script>

import { auth } from "../firebaseConfig";


const handleLogout = async () => {
		try {
			await auth.signOut();
			console.log("user is logged out");
		} catch (error) {
			console.error("Logout error:", error.message);
		}
	};

    function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      handleLogout();
    }
  }


</script>


<div>

    
    <img on:click={handleLogout} on:keydown={handleKeydown} class="logout" src="/img/logout.svg" alt="Log Out Button">
    
</div>

<style>
@import "../Styles.css";

div {
    display: flex;
    border-bottom: 1px solid var(--color-accent);
    position: relative;
    background-color: var(--color-accent);
    height: 3rem;
}

.logout {
    position: absolute;
    right: 1rem;
    width: 5%;
    align-self: center;
}
.logout:hover {
    cursor: pointer;
}


</style>


