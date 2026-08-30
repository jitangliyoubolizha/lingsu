import { createRouter, createWebHashHistory } from 'vue-router'

import { hasAgreed } from '../store'
import { pagerSettling } from './composables/useSwipeNavigate'
import AgreementView from './views/AgreementView.vue'
import ClauseDetailView from './views/ClauseDetailView.vue'
import ClauseListView from './views/ClauseListView.vue'
import CompareView from './views/CompareView.vue'
import DisclaimerView from './views/DisclaimerView.vue'
import FavoritesView from './views/FavoritesView.vue'
import FeedbackView from './views/FeedbackView.vue'
import FormulaDetailView from './views/FormulaDetailView.vue'
import FormulaListView from './views/FormulaListView.vue'
import GraphView from './views/GraphView.vue'
import HerbDetailView from './views/HerbDetailView.vue'
import HomeView from './views/HomeView.vue'
import ProfileView from './views/ProfileView.vue'
import QuizView from './views/QuizView.vue'
import SearchView from './views/SearchView.vue'
import StatsView from './views/StatsView.vue'
import StudyTaskView from './views/StudyTaskView.vue'
import WrongBookView from './views/WrongBookView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  // 条文详情页（含条文间切换）回顶；其余路由交还浏览器默认（返回列表可还原滚动位置）。
  // 整页滑动交接期间抑制回顶：落点保持拖动时的阅读位置
  scrollBehavior(to) {
    if (to.name !== 'clause-detail') return false
    return pagerSettling.value ? false : { top: 0 }
  },
  routes: [
    {
      path: '/agreement',
      name: 'agreement',
      component: AgreementView,
      meta: { bare: true },
    },
    {
      path: '/disclaimer',
      name: 'disclaimer',
      component: DisclaimerView,
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { navKey: 'home', bottomNav: true },
    },
    {
      path: '/study',
      name: 'study',
      component: StudyTaskView,
      meta: { navKey: 'home' },
    },
    {
      path: '/clauses',
      name: 'clauses',
      component: ClauseListView,
    },
    {
      path: '/clauses/:id',
      name: 'clause-detail',
      component: ClauseDetailView,
      meta: { ownComplianceBanner: true },
    },
    {
      path: '/formulas',
      name: 'formulas',
      component: FormulaListView,
    },
    {
      path: '/formulas/:id',
      name: 'formula-detail',
      component: FormulaDetailView,
    },
    {
      path: '/herbs/:id',
      name: 'herb-detail',
      component: HerbDetailView,
    },
    {
      path: '/graph',
      name: 'graph',
      component: GraphView,
    },
    {
      path: '/compare',
      name: 'compare',
      component: CompareView,
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: FavoritesView,
      meta: { navKey: 'profile' },
    },
    {
      path: '/search',
      name: 'search',
      component: SearchView,
      meta: { ownComplianceBanner: true },
    },
    {
      path: '/quiz',
      name: 'quiz',
      component: QuizView,
      meta: { navKey: 'quiz', bottomNav: true },
    },
    {
      path: '/wrong-book',
      name: 'wrong-book',
      component: WrongBookView,
      meta: { navKey: 'profile' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: StatsView,
      meta: { navKey: 'stats', bottomNav: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { navKey: 'profile', bottomNav: true },
    },
    {
      path: '/feedback',
      name: 'feedback',
      component: FeedbackView,
      meta: { navKey: 'profile' },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.name === 'agreement' || to.name === 'disclaimer') {
    return true
  }
  const agreed = await hasAgreed()
  if (!agreed) {
    return { name: 'agreement' }
  }
  return true
})

export default router
