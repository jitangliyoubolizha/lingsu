/**
 * 每日队列与学习计划取新卡。
 */
import type { Clause } from '../../data/types'
import { getDueCards } from './fsrs'
import type { DailyQueue, MemoryCard, StudyPlan } from './types'

/**
 * 判断条文是否属于某学习计划范围。
 */
export function isClauseInPlan(clause: Clause, plan: StudyPlan): boolean {
  const segments = clause.id.split('.')
  if (segments.length < 4) {
    return false
  }
  const [book, edition, chapter] = segments
  return (
    book === plan.scope.book &&
    edition === plan.scope.edition &&
    plan.scope.chapters.includes(chapter)
  )
}

/**
 * 按学习计划取新条文：从未学且属于计划范围的条文中，按条文号升序取 count 条。
 * @param plan 学习计划
 * @param count 本次要取的新条文数量
 * @param learnedClauseIds 已学条文 ID 集合
 * @param clauses 全部条文
 * @returns 新条文列表
 */
export function getNewClauses(
  plan: StudyPlan,
  count: number,
  learnedClauseIds: Set<string>,
  clauses: Clause[]
): Clause[] {
  return clauses
    .filter((clause) => isClauseInPlan(clause, plan) && !learnedClauseIds.has(clause.id))
    .sort((a, b) => a.no - b.no)
    .slice(0, Math.max(0, count))
}

/**
 * 生成今日队列：到期复习优先，新学顺延，总条数不超过 maxItems。
 * @param dueCards 全部到期复习卡片（可传全部卡片由函数过滤，也可传已过滤结果）
 * @param plans 学习计划，最多取前两个 active
 * @param clauses 全部条文
 * @param learnedClauseIds 已学条文 ID 集合
 * @param maxItems 单日队列上限，默认 20
 * @param now 当前时间
 * @returns 今日队列
 */
export function getTodayQueue(
  dueCards: MemoryCard[],
  plans: StudyPlan[],
  clauses: Clause[],
  learnedClauseIds: Set<string>,
  maxItems = 20,
  now: Date = new Date()
): DailyQueue {
  const due = getDueCards(dueCards, now)
  const activePlans = plans.filter((plan) => plan.status === 'active').slice(0, 2)

  const newById = new Map<string, Clause>()
  for (const plan of activePlans) {
    const fresh = getNewClauses(plan, plan.dailyNew, learnedClauseIds, clauses)
    for (const clause of fresh) {
      if (!newById.has(clause.id)) {
        newById.set(clause.id, clause)
      }
    }
  }

  const allNew = Array.from(newById.values())
  const newCount = Math.max(0, maxItems - due.length)

  return {
    dueCards: due,
    newClauses: allNew.slice(0, newCount),
  }
}
