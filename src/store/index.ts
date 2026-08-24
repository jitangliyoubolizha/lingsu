export { exportData, importData, parseBackup, serializeBackup, validateBackupData } from './backup'
export type { BackupData } from './backup'
export {
  getCardByClause,
  getAllCards,
  getClauseStates,
  getReviewLogs,
  markClauseLearned,
  saveCard,
  saveReviewLog,
} from './cards'
export { db } from './db'
export type {
  ClauseStateRecord,
  DailyLogRecord,
  FavoriteRecord,
  QuizLogRecord,
  SettingsRecord,
  WrongQuestionRecord,
} from './db'
export { addFavorite, getFavorites, isFavorite, removeFavorite } from './favorites'
export {
  addQuizLog,
  addWrongQuestion,
  getAllDailyLogs,
  getDailyLog,
  getDueWrongQuestions,
  getQuizLogs,
  getWrongQuestions,
  markWrongCorrect,
  resolveWrongQuestion,
  saveDailyLog,
} from './logs'
export { CURRENT_SCHEMA_VERSION, migrations, runMigrations } from './migrations'
export { getSetting, hasAgreed, markAgreed, setSetting } from './settings'
export {
  createStudyPlan,
  deleteStudyPlan,
  ensureDefaultStudyPlan,
  getActivePlanCount,
  getActiveStudyPlans,
  getAllStudyPlans,
  MAX_ACTIVE_PLANS,
  saveStudyPlan,
  togglePlanStatus,
} from './studyPlans'
export type { CreateStudyPlanInput } from './studyPlans'
