<script setup>
function openPublicView() {
    window.open('http://localhost:3008', '_blank')
}
</script>

<template>
    <button :class="$style.toggle" @click="openPublicView">
        Open Public View
    </button>
</template>

<style module>
.toggle {
    position: fixed;
    z-index: 1000;
    bottom: 20px;
    right: 20px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: monospace;
    backdrop-filter: blur(4px);
}

.toggle:hover {
    background: rgba(0, 0, 0, 0.85);
}
</style>
