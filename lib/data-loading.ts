/**
 * Data Loading Utilities
 * 
 * Ensures MongoDB is the single source of truth and prevents data loss
 * on server restarts, redeploys, or crashes.
 */

import * as store from '@/lib/template-store'
import { Template, FormSection } from '@/types'

/**
 * Initializes the application data from MongoDB
 * 
 * IMPORTANT: This is called exactly once when the app loads in the browser.
 * It waits for MongoDB to load all templates before rendering any content.
 * 
 * NEVER:
 * - Call this multiple times
 * - Apply defaults that could overwrite MongoDB data
 * - Use localStorage as fallback if MongoDB is empty
 * - Create sample data on load
 * 
 * ALWAYS:
 * - Wait for this to complete before rendering templates list
 * - Load whatever data exists in MongoDB (even if empty)
 * - Show loading state while this runs
 */
export async function initializeAppData(): Promise<void> {
  return store.initializeFromDatabase()
}

/**
 * Checks if the store has finished loading from MongoDB
 * Use this to show loading UI on all pages
 */
export function isDataLoading(): boolean {
  return store.isStoreLoading()
}

/**
 * Checks if the store has been initialized
 */
export function isDataInitialized(): boolean {
  return store.isStoreInitialized()
}

/**
 * Gets all templates from the store
 * SAFE TO CALL: Only after initialization completes
 */
export function getAllTemplates(): Template[] {
  return store.getTemplates()
}

/**
 * Gets a single template by ID
 * SAFE TO CALL: Only after initialization completes
 */
export function getTemplateById(id: string): Template | undefined {
  return store.getTemplate(id)
}

/**
 * Save handler - called ONLY on user action
 * NEVER called on:
 * - Page load
 * - Server restart
 * - Component mount
 * - Store initialization
 * 
 * ALWAYS called on:
 * - User clicks Save button
 * - User edits form field and debounce completes
 * - User action explicitly triggers save
 */
export async function saveTemplateData(
  id: string,
  updates: Partial<Template>
): Promise<void> {
  return store.updateTemplate(id, updates)
}

/**
 * Add a new template (called when user uploads)
 */
export async function addNewTemplate(template: Template): Promise<void> {
  return store.addTemplate(template)
}

/**
 * Delete a template (called when user confirms deletion)
 */
export async function deleteTemplate(id: string): Promise<void> {
  return store.removeTemplate(id)
}

/**
 * PRODUCTION SAFETY CHECKLIST
 * 
 * These patterns ensure data persists even after:
 * - Server crash
 * - Database connection reset
 * - Server redeploy
 * - Browser refresh
 * - Network interruption during save
 * 
 * CRITICAL RULES:
 * 
 * 1. MongoDB is SOURCE OF TRUTH
 *    - Store loads from MongoDB on init (ONE TIME)
 *    - No defaults, no seeding, no empty state fallbacks
 *    - If DB is empty, store remains empty
 * 
 * 2. Show loading UI until DB loads
 *    - Use `isDataLoading()` to check if ready
 *    - Don't render content until loading is false
 *    - Don't render empty fallback as if data failed to load
 * 
 * 3. Save ONLY on user action
 *    - Not on mount
 *    - Not on reload
 *    - Not on server restart
 *    - Only when user clicks Save or changes trigger save
 * 
 * 4. Error handling
 *    - If save fails, show error to user
 *    - Keep UI in edit state so user can retry
 *    - Don't auto-save on background intervals
 * 
 * 5. Prevent concurrent saves
 *    - Disable save button during save
 *    - Track pending saves by template ID
 *    - Don't send multiple requests simultaneously
 */
