import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import AdminPanel from './AdminPanel.vue'
import { createRouter, createWebHistory } from 'vue-router'
import JumpRunMap from './components/JumpRunMap.vue'

// 2. Define some routes
// Each route should map to a component.
// We'll talk about nested routes later.
const routes = [
    { path: '/', component: JumpRunMap },
    { path: '/admin', component: AdminPanel },
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = createRouter({
    // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
    history: createWebHistory(),
    routes, // short for `routes: routes`
})

// 5. Create and mount the root instance.
const app = createApp(App)
// Make sure to _use_ the router instance to make the
// whole app router-aware.
app.use(router)

app.mount('#app')
