<script setup>
import { ref, onMounted } from 'vue'

const mapboxApiKey = ref('')
const mapCenter = ref('')
const saved = ref(false)

onMounted(async () => {
    try {
        const res = await fetch(
            `http://localhost:3008/api/storage`,
        )
        const data = await res.json()
        if (data.settings) {
            mapboxApiKey.value = data.settings.mapboxApiKey || ''
            mapCenter.value = data.settings.mapCenter || ''
        }
    } catch {
        // Settings not available yet
    }
})

async function save() {
    await fetch(`http://localhost:3009/api/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            settings: {
                mapboxApiKey: mapboxApiKey.value,
                mapCenter: mapCenter.value,
            },
        }),
    })
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
    <div :class="$style.container">
        <h3 :class="$style.heading">Settings</h3>
        <form :class="$style.form" @submit.prevent="save">
            <label :class="$style.inputWrapper">
                Mapbox API Key
                <input
                    v-model="mapboxApiKey"
                    type="text"
                    placeholder="pk.eyJ1Ijo..."
                    :class="$style.input"
                />
            </label>

            <label :class="$style.inputWrapper">
                Map Center (lng, lat)
                <input
                    v-model="mapCenter"
                    type="text"
                    placeholder="17.42929, 60.28519"
                    :class="$style.input"
                />
            </label>

            <p :class="$style.hint">
                Changes take effect after reloading the page.
            </p>

            <button :class="$style.button" type="submit">
                {{ saved ? 'Saved!' : 'Save settings' }}
            </button>
        </form>
    </div>
</template>

<style module>
.container {
    padding: 10px;
    max-width: 600px;
    margin: 0 auto;
}

.heading {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: bold;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.inputWrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
}

.input {
    padding: 4px 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
}

.hint {
    margin: 0;
    font-size: 11px;
    color: #888;
}

.button {
    padding: 6px 15px;
    border-radius: 6px;
    border: none;
    background: #2938c7;
    color: #fff;
    cursor: pointer;
    margin-top: 4px;
}
</style>
