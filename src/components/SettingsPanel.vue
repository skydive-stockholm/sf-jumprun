<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
    staff: { type: Object, required: true },
})

const emit = defineEmits(['close', 'save'])

const manifestor = ref('')
const jumpLeader = ref('')
const pilot = ref('')
const mapCenter = ref('')
const manifestPhone = ref('')
const separation = ref('')
const saved = ref(false)

onMounted(async () => {
    manifestor.value = props.staff.manifestor || ''
    jumpLeader.value = props.staff.jumpLeader || ''
    pilot.value = props.staff.pilot || ''

    try {
        const res = await fetch('http://localhost:3008/api/storage')
        const data = await res.json()
        if (data.settings) {
            mapCenter.value = data.settings.mapCenter || ''
            manifestPhone.value = data.settings.manifestPhone || ''
            separation.value = data.settings.separation || ''
        }
    } catch {
        // Backend not available yet
    }
})

async function save() {
    const staffData = {
        manifestor: manifestor.value,
        jumpLeader: jumpLeader.value,
        pilot: pilot.value,
    }
    const settingsPayload = {
        mapCenter: mapCenter.value,
        manifestPhone: manifestPhone.value,
        separation: separation.value,
    }

    await Promise.all([
        fetch('http://localhost:3009/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staff: staffData }),
        }),
        fetch('http://localhost:3009/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: settingsPayload }),
        }),
    ])

    emit('save', { staff: staffData, settings: settingsPayload })

    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
    <div :class="$style.overlay">
        <div :class="$style.panel">
            <div :class="$style.header">
                <h2 :class="$style.title">Settings</h2>
                <button :class="$style.closeButton" @click="$emit('close')">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <form :class="$style.form" @submit.prevent="save">
                <fieldset :class="$style.section">
                    <legend :class="$style.sectionTitle">Staff</legend>

                    <label :class="$style.field">
                        <span :class="$style.label">Manifest</span>
                        <input
                            v-model="manifestor"
                            type="text"
                            :class="$style.input"
                        />
                    </label>

                    <label :class="$style.field">
                        <span :class="$style.label">Jump leader</span>
                        <input
                            v-model="jumpLeader"
                            type="text"
                            :class="$style.input"
                        />
                    </label>

                    <label :class="$style.field">
                        <span :class="$style.label">Pilot</span>
                        <input
                            v-model="pilot"
                            type="text"
                            :class="$style.input"
                        />
                    </label>
                </fieldset>

                <fieldset :class="$style.section">
                    <legend :class="$style.sectionTitle">Display</legend>

                    <label :class="$style.field">
                        <span :class="$style.label">Manifest phone</span>
                        <input
                            v-model="manifestPhone"
                            type="text"
                            placeholder="+46 76 135 43 85"
                            :class="$style.input"
                        />
                        <span :class="$style.hint"
                            >Leave empty to hide from info box</span
                        >
                    </label>

                    <label :class="$style.field">
                        <span :class="$style.label">Separation</span>
                        <input
                            v-model="separation"
                            type="text"
                            placeholder="Small groups: 8s, Large groups: 12s"
                            :class="$style.input"
                        />
                        <span :class="$style.hint"
                            >Leave empty to hide from info box</span
                        >
                    </label>
                </fieldset>

                <fieldset :class="$style.section">
                    <legend :class="$style.sectionTitle">Map</legend>

                    <label :class="$style.field">
                        <span :class="$style.label">Map center</span>
                        <input
                            v-model="mapCenter"
                            type="text"
                            placeholder="17.42929, 60.28519"
                            :class="$style.input"
                        />
                        <span :class="$style.hint">lng, lat</span>
                    </label>
                </fieldset>

                <div :class="$style.actions">
                    <button :class="$style.saveButton" type="submit">
                        {{ saved ? 'Saved!' : 'Save' }}
                    </button>
                    <button
                        :class="$style.cancelButton"
                        type="button"
                        @click="$emit('close')"
                    >
                        Close
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<style module>
.overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
}

.panel {
    background: #fff;
    border-radius: 12px;
    width: 90vw;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    padding: 28px 32px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
}

.title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111;
}

.closeButton {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
}

.closeButton:hover {
    color: #111;
    background: #f3f4f6;
}

.form {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.section {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.sectionTitle {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
    margin-bottom: 4px;
    padding: 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.label {
    font-size: 13px;
    font-weight: 500;
    color: #333;
}

.input {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
    background: #fafafa;
}

.input:focus {
    border-color: #4a8af4;
    box-shadow: 0 0 0 3px rgba(74, 138, 244, 0.12);
    background: #fff;
}

.hint {
    font-size: 11px;
    color: #999;
}

.actions {
    display: flex;
    gap: 10px;
    padding-top: 8px;
}

.saveButton {
    flex: 1;
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    background: #2938c7;
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
}

.saveButton:hover {
    background: #1e2ba0;
}

.cancelButton {
    padding: 10px 20px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    background: #fff;
    color: #333;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
}

.cancelButton:hover {
    background: #f3f4f6;
}
</style>
