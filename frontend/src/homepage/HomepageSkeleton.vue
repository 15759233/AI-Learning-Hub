<template>
  <div class="homepage-skeleton" aria-hidden="true">
    <section class="homepage-skeleton-hero"><i /><div><span /><span /><span /><button /></div></section>
    <section><header /><div class="homepage-skeleton-grid"><i v-for="index in 6" :key="index" /></div></section>
    <section><header /><div class="homepage-skeleton-grid large"><i v-for="index in 3" :key="index" /></div></section>
  </div>
</template>
