<script>
  import Form from "@svelteschool/svelte-forms";
	import Tournament from './components/Tournament.svelte';
	import Staff from './components/Staff.svelte';
	import Dan from './components/Dan.svelte';

	let tournaments = [];
	let staffs = [];
	let dans = [];

	let tournament = {};
	let staff = {};
	let dan = {};

	const addTournament = () => {
		tournaments = [...tournaments, tournament];
		tournament = {};
	};
	const addStaff = () => {
		staffs = [...staffs, staff];
		staff = {};
	};
	const addDan = () => {
		dans = [...dans, dan];
		dan = {};
	};
	const removeTournament = () => {
		tournaments = tournaments.slice(0, -1);
	};
	const removeStaff = () => {
		staffs = staffs.slice(0, -1);
	};
	const removeDan = () => {
		dans = dans.slice(0, -1);
	};
</script>

<main>
	<div class="content">
		<Form bind:values={tournament}>
			<input type="text" placeholder="Full name" name="name" />
			<input type="text" placeholder="Shorthand" name="short" />
			<br />
			<input type="text" placeholder="Description" name="description" />
			<input type="text" placeholder="Placement" name="placement" />
			<br />
			<input type="text" placeholder="Total participants" name="participants" />
			<input type="text" placeholder="Period/date" name="period" />
		</Form>
		<button on:click={addTournament}>Add tournament</button>
		<button on:click={removeTournament}>Remove last tournament</button>
		<div id="tournaments">
			{#each tournaments as tournament}
				<Tournament {tournament} />
			{/each}
			<Tournament {tournament} />
		</div>
		<br />

		<Form bind:values={staff}>
			<input type="text" placeholder="Full name" name="name" />
			<input type="text" placeholder="Shorthand" name="short" />
			<br />
			<input type="text" placeholder="Description" name="description" />
			<input type="text" placeholder="Period/date" name="period" />
			<br />
			<label><input type="checkbox" name="stream" /> 📺 Stream</label>
			<label><input type="checkbox" name="commentary" /> 🎙️ Commentary</label>
			<label><input type="checkbox" name="referee" /> 👮 Referee</label>
			<label><input type="checkbox" name="mappool" /> 🎶 Mappool</label>
			<label><input type="checkbox" name="mapper" /> 🎼 Mapper</label>
			<label><input type="checkbox" name="host" /> 👑 Host</label>
			<br />
			<input type="text" placeholder="Custom emojis" name="extra" />
		</Form>
		<button on:click={addStaff}>Add staff</button>
		<button on:click={removeStaff}>Remove last staff</button>
		<div id="staffs">
			{#each staffs as staff}
				<Staff {staff} />
			{/each}
			<Staff {staff} />
		</div>
		<br />

		(you can probably use that last one for anything else, just ignore the field names)
		<Form bind:values={dan}>
			<input type="text" placeholder="Name" name="name" />
			<input type="text" placeholder="Grade" name="grade" />
			<br />
			<input type="text" placeholder="Percent" name="percent" />
			<input type="text" placeholder="Date" name="date" />
			<br />
			<label><input type="checkbox" name="v2" /> Score v2</label>
		</Form>
		<button on:click={addDan}>Add dan</button>
		<button on:click={removeDan}>Remove last dan</button>
		<div id="dans">
			{#each dans as dan}
				<Dan {dan} />
			{/each}
			<Dan {dan} />
		</div>
		<br />
	</div>
</main>

<style>
	main {
		background: #2a2226;
		margin: 0;
		height: 100%;
	}
	.content {
		padding: 1em;
		max-width: 800px;
		margin: 0 auto;
	}
	input[type="text"] {
		min-width: 300px;
	}
	label {
		margin-right: 1em;
	}
	input, button {
		font-family: inherit;
		font-size: inherit;
		-webkit-padding: 0.4em 0;
		padding: 0.4em;
		margin: 0 0 0.5em 0;
		box-sizing: border-box;
		border: 1px solid #ccc;
		border-radius: 2px;
	}
	input:disabled {
		color: #ccc;
	}
	button {
		color: #333;
		background-color: #f4f4f4;
		outline: none;
	}
	button:disabled {
		color: #999;
	}
	button:not(:disabled):active {
		background-color: #ddd;
	}
	button:focus {
		border-color: #666;
	}
</style>