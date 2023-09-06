<script setup>
import axios from 'axios'
import { reactive } from 'vue'

defineEmits(['cancel'])

const data = reactive({
    staff: {
        manifestor: '',
        jumpLeader: '',
        pilot: '',
    },
})

axios.get(`http://${import.meta.env.VITE_HOST}:3008/api/storage`).then(res => {
    if (res.data.staff) {
        data.staff = res.data.staff
    }

    if (res.data.jumprun) {
        data.jumprun = res.data.jumprun
    }
})

const save = () => {
    axios.post(`http://${import.meta.env.VITE_HOST}:3008/api/storage`, data)
}
</script>

<template>
    <div :class="$style.container">
        <form :class="$style.form" @submit.prevent="save">
            <label :class="$style.inputWrapper">
                Manifestor
                <input v-model="data.staff.manifestor" type="text" />
            </label>

            <label :class="$style.inputWrapper">
                Jump leader
                <input v-model="data.staff.jumpLeader" type="text" />
            </label>

            <label :class="$style.inputWrapper">
                Pilot
                <input v-model="data.staff.pilot" type="text" />
            </label>

            <!--            <div :class="$style.jumprunSliders">-->
            <!--                <label>-->
            <!--                    Start-->
            <!--                    <input-->
            <!--                        v-model.number="data.jumprun.start"-->
            <!--                        min="-4"-->
            <!--                        max="4"-->
            <!--                        step="0.1"-->
            <!--                        type="range"-->
            <!--                    />-->
            <!--                    {{ data.jumprun.start }}nm-->
            <!--                </label>-->

            <!--                <label>-->
            <!--                    End-->
            <!--                    <input-->
            <!--                        v-model.number="data.jumprun.end"-->
            <!--                        min="-4"-->
            <!--                        max="4"-->
            <!--                        step="0.1"-->
            <!--                        type="range"-->
            <!--                    />-->
            <!--                    {{ data.jumprun.end }}nm-->
            <!--                </label>-->

            <!--                <label>-->
            <!--                    Shift-->
            <!--                    <input-->
            <!--                        v-model.number="data.jumprun.shift"-->
            <!--                        min="-0.5"-->
            <!--                        max="0.5"-->
            <!--                        step="0.01"-->
            <!--                        type="range"-->
            <!--                    />-->
            <!--                    {{ data.jumprun.shift }}nm-->
            <!--                </label>-->

            <!--                <label>-->
            <!--                    Angle-->
            <!--                    <input-->
            <!--                        v-model.number="data.jumprun.angle"-->
            <!--                        min="0"-->
            <!--                        max="360"-->
            <!--                        type="range"-->
            <!--                    />-->
            <!--                    {{ data.jumprun.angle }}°-->
            <!--                </label>-->
            <!--            </div>-->

            <button :class="$style.button" type="submit">Save</button>
            <button
                :class="[$style.button, $style.cancelButton]"
                @click="$emit('cancel')"
            >
                Cancel
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

.form {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.inputWrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.button {
    padding: 6px 15px;
    border-radius: 6px;
    border: none;
    background: #2938c7;
    color: #fff;
    cursor: pointer;
    margin-top: 10px;
}

.cancelButton {
    background: #383838;
    color: #fff;
    border: 1px solid #383838;
}

.header {
    margin-bottom: 20px;
}

.jumprunSliders {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
}
</style>
