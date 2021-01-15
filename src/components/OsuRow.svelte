<script>
  export let title;
  export let description;
  export let date;
</script>

<div class="osu-row">
  <div class="left">
    <div class="title">{title}</div>
    <div class="description">
      {description}
      <span class="period">{date}</span>
    </div>
  </div>
  <div class="right">
    <slot></slot>
  </div>
</div>

<style>
  .osu-row {
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
    padding: 6px 6px 6px 12px;
    text-align: right;
    position: relative;
    width: 85px;
    color: rgb(255, 102, 171);
    background: #382e32;
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    border-radius: 0 10px 10px 0;
  }
</style>
