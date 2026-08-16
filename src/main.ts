import { createApp } from 'vue'

import App from './App.vue'
import router from './ui/router'
import './style.css'

createApp(App).use(router).mount('#app')
