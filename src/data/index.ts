import { LocalRepo } from './localRepo'
import { RepoError } from './repository'
import type { NewPickup, ScrapLoopRepo } from './repository'

/**
 * The shared repo instance. UI and feature code import from here only —
 * swapping localStorage for Firestore post-MVP means changing this one file.
 */
export const repo: ScrapLoopRepo = new LocalRepo()

export { RepoError }
export type { NewPickup, ScrapLoopRepo }
