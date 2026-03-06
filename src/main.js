import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import PublicMap from './components/PublicMap.vue'
import JumpRunMap from './components/JumpRunMap.vue'

const routes = [
    { path: '/', component: PublicMap },
    { path: '/admin', component: JumpRunMap },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const app = createApp(App)
app.use(router)

app.mount('#app')
