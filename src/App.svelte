<script>
	import tournaments from './data/tournaments';
	import staffs from './data/staffs';
	import dans from './data/dans';

	import Tournament from './components/Tournament.svelte';
	import Staff from './components/Staff.svelte';
	import Dan from './components/Dan.svelte';
</script>

<main>
	<div class="title">
		<h1>Paturages</h1>
		<div class="subtitle">...or why the hell is a Clone Hero player a mania accuracy player</div>
	</div>
	<div class="tournaments">
		{#each tournaments as tournament}
			<Tournament {tournament} />
		{/each}
	</div>
	<div class="staffs">
		{#each staffs as staff}
			<Staff {staff} />
		{/each}
	</div>
	<div class="dans">
		{#each dans as dan}
			<Dan {dan} />
		{/each}
	</div>
</main>

<style>
	main {
		padding: 1em;
		max-width: 800px;
		margin: 0 auto;
	}
	h1 {
		font-weight: 100;
		margin: 0;
	}
	.subtitle {
		font-size: .8em;
	}
	.title {
		padding: .5em .5em .5em 0;
		border-bottom: 1px solid #aaa;
	}
</style>