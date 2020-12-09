<script>
  export let staff;
</script>

<div class="staff">
  <div class="left">
    <div class="title">
      {staff.name}
      {#if staff.short}({staff.short}){/if}
    </div>
    <div class="description">
      {staff.description}
      <span class="period">{staff.period}</span>
    </div>
  </div>
  <div class="right">
    {#if staff.stream}
      <span>📺</span>
    {/if}
    {#if staff.commentary}
      <span>🎙️</span>
    {/if}
    {#if staff.referee}
      <span>👮</span>
    {/if}
  </div>
</div>

<style>
  .staff {
    font-size: 12px;
    margin: 2px 0;
    background: #46393f;
    border-radius: 10px;
    display: flex;
  }
  .title {
    font-size: 14px;
  }
  .description {
    color: rgb(255, 204, 34);
    margin-top: 1px;
  }
  .period {
    color: rgb(163, 143, 152);
    margin-left: 1em;
  }
  .left {
    flex: 1;
    padding: .5em 1em;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .right::before {
    content: "";
    background-color: #46393f;
    width: 10px;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    -webkit-clip-path: polygon(0 0,100% 50%,0 100%);
    clip-path: polygon(0 0,100% 50%,0 100%);
  }
  .right {
    font-size: 16px;
    padding: 6px 6px 6px 12px;
    text-align: right;
    position: relative;
    width: 72px;
    color: rgb(255, 102, 171);
    background: #382e32;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    border-radius: 0 10px 10px 0;
  }
</style>
