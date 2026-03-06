import { ref } from 'vue'

const viewMode = ref('admin')

export function useViewMode() {
    function toggle() {
        viewMode.value = viewMode.value === 'admin' ? 'public' : 'admin'
    }

    return { viewMode, toggle }
}
