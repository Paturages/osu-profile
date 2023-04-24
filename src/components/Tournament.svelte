<script>
  import OsuRow from './OsuRow.svelte';
  export let tournament;
  let title, description, date;
  $: title = tournament.name + (tournament.short ? ` (${tournament.short})` : '');
  $: description = tournament.description;
  $: date = tournament.period;
  $: link = tournament.link;
</script>

<OsuRow {link} {title} {description} {date}>
  <div class="content">
    <div class="placement"><b>{tournament.placement}</b></div>
    <div class="participants">/ {tournament.participants}</div>
  </div>
</OsuRow>

<style>
  .content {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
  }
  .placement {
    font-size: 14px;
  }
</style>
