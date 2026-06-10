<script setup>
import { ref } from 'vue'

const emit = defineEmits(['complete'])

const mapCenter = ref('17.42929, 60.28519')

async function save() {
    await fetch(`${location.protocol}//${location.hostname}:3009/api/storage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            settings: {
                mapCenter: mapCenter.value.trim() || '17.42929, 60.28519',
            },
        }),
    })

    emit('complete')
}
</script>

<template>
    <div :class="$style.overlay">
        <div :class="$style.card">
            <h1 :class="$style.title">Welcome to SF Jump Run</h1>
            <p :class="$style.subtitle">
                Enter your settings to get started.
            </p>

            <form :class="$style.form" @submit.prevent="save">
                <label :class="$style.label">
                    Map Center (lng, lat)
                    <input
                        v-model="mapCenter"
                        type="text"
                        placeholder="17.42929, 60.28519"
                        :class="$style.input"
                    />
                    <span :class="$style.hint">
                        Default: ESKG Gryttjom Airfield
                    </span>
                </label>

                <button :class="$style.button" type="submit">
                    Get started
                </button>
            </form>
        </div>
    </div>
</template>

<style module>
.overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
}

.card {
    background: #fff;
    border-radius: 12px;
    padding: 40px;
    max-width: 460px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.title {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: bold;
    color: #1a1a2e;
}

.subtitle {
    margin: 0 0 24px;
    font-size: 14px;
    color: #666;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #333;
}

.input {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    font-weight: normal;
    transition: border-color 0.15s;
}

.input:focus {
    outline: none;
    border-color: #4a8af4;
    box-shadow: 0 0 0 3px rgba(74, 138, 244, 0.15);
}

.hint {
    font-size: 11px;
    color: #999;
    font-weight: normal;
}

.button {
    margin-top: 8px;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #4a8af4;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
}

.button:hover {
    background: #3a7ae4;
}
</style>
