import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// 导入组件
import FormulaConverter from './components/FormulaConverter.vue'
import MixedTextConverter from './components/MixedTextConverter.vue'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'formula',
    component: FormulaConverter,
    meta: { title: 'KaTeX 公式转换器' }
  },
  {
    path: '/mixed',
    name: 'mixed',
    component: MixedTextConverter,
    meta: { title: '混合文本转换器' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 更新页面标题
router.afterEach((to) => {
  document.title = to.meta.title || 'KaTeX to PNG Converter'
})

const app = createApp(App)
app.use(router)
app.mount('#app')