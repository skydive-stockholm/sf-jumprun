<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const updateReady = ref(false)
let removeListener = null

onMounted(() => {
    if (!window.electronAPI) return

    removeListener = window.electronAPI.onUpdateDownloaded(() => {
        updateReady.value = true
    })
})

onUnmounted(() => {
    removeListener?.()
})

function install() {
    window.electronAPI.installUpdate()
}
</script>

<template>
    <div v-if="updateReady" :class="$style.banner">
        A new version is available.
        <button :class="$style.button" @click="install">
            Restart to update
        </button>
    </div>
</template>

<style module>
.banner {
    position: fixed;
    z-index: 2000;
    top: 0;
    left: 0;
    right: 0;
    padding: 8px 16px;
    background: #4a8af4;
    color: #fff;
    text-align: center;
    font-family: monospace;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.button {
    padding: 4px 12px;
    background: #fff;
    color: #4a8af4;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-family: monospace;
}
</style>
