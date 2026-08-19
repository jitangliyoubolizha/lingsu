import { createRouter, createWebHashHistory } from 'vue-router'

import { hasAgreed } from '../store'
import AgreementView from './views/AgreementView.vue'
import ClauseDetailView from './views/ClauseDetailView.vue'
import ClauseListView from './views/ClauseListView.vue'
import CompareView from './views/CompareView.vue'
import FeedbackView from './views/FeedbackView.vue'
import FormulaDetailView from './views/FormulaDetailView.vue'
import FormulaListView from './views/FormulaListView.vue'
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
  routes: [
    {
      path: '/agreement',
      name: 'agreement',
      component: AgreementView,
      meta: { bare: true },
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
      path: '/compare',
      name: 'compare',
      component: CompareView,
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
  if (to.name === 'agreement') {
    return true
  }
  const agreed = await hasAgreed()
  if (!agreed) {
    return { name: 'agreement' }
  }
  return true
})

export default router
