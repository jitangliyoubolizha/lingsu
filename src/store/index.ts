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
export { deleteNote, getNote, saveNote } from './notes'
export type { NoteRecord } from './db'
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
  updateActivePlansDailyNew,
} from './studyPlans'
export type { CreateStudyPlanInput } from './studyPlans'
