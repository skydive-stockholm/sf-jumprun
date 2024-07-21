<script setup>
const emit = defineEmits([
    'close',
    'save',
    'update:manifestor',
    'update:jumpLeader',
    'update:pilot',
])

const props = defineProps({
    manifestor: {
        type: String,
        required: true,
    },
    jumpLeader: {
        type: String,
        required: true,
    },
    pilot: {
        type: String,
        required: true,
    },
})

const save = () => {
    emit('close')
    emit('save')
}
</script>

<template>
    <div :class="$style.container">
        <form :class="$style.form" @submit.prevent="save">
            <label :class="$style.inputWrapper">
                Manifest
                <input
                    type="text"
                    :autofocus="false"
                    :value="props.manifestor"
                    @input="$emit('update:manifestor', $event.target.value)"
                />
            </label>

            <label :class="$style.inputWrapper">
                Jump leader
                <input
                    type="text"
                    :autofocus="false"
                    :value="props.jumpLeader"
                    @input="$emit('update:jumpLeader', $event.target.value)"
                />
            </label>

            <label :class="$style.inputWrapper">
                Pilot
                <input
                    type="text"
                    :autofocus="false"
                    :value="props.pilot"
                    @input="$emit('update:pilot', $event.target.value)"
                />
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

.header {
    margin-bottom: 20px;
}

.jumprunSliders {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
}
</style>
