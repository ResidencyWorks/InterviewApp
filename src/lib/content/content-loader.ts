import { analytics } from '@/lib/analytics'
import { errorMonitoring } from '@/lib/error-monitoring'
import { contentPackCache } from '@/lib/redis'
import type { ContentPack, ContentPackData } from '@/types/content'
import { v4 as uuidv4 } from 'uuid'
import type {
  ContentLoadOptions,
  ContentPackServiceInterface,
  ContentValidationResult,
} from './content-types'
import { contentPackValidator } from './content-validator'

/**
 * Content pack loader service
 */
export class ContentPackLoader implements ContentPackServiceInterface {
  private activePackId: string | null = null

  /**
   * Load content pack from file
   * @param file - File to load
   * @param options - Loading options
   * @returns Promise resolving to loaded content pack
   */
  async load(
    file: File,
    options: ContentLoadOptions = {
      validate: true,
      preview: false,
      overwrite: false,
      backup: false,
    }
  ): Promise<ContentPack> {
    try {
      // Read file content
      const text = await file.text()
      const data: ContentPackData = JSON.parse(text)

      // Validate if requested
      if (options.validate) {
        const validation = await contentPackValidator.validate(data)
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
        }
      }

      // Create content pack
      const contentPack: ContentPack = {
        id: uuidv4(),
        name: data.name,
        version: data.version,
        content: data,
        is_active: false,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system', // TODO: Get from auth context
        tags: data.metadata.tags,
        download_count: 0,
        reviews_count: 0,
      }

      // Backup existing pack if requested
      if (options.backup && this.activePackId) {
        const existingPack = await this.get(this.activePackId)
        if (existingPack) {
          await this.backup(existingPack)
        }
      }

      // Save to cache
      await contentPackCache.set(contentPack.id, contentPack)

      // Set as active if not preview
      if (!options.preview) {
        await this.setActive(contentPack.id)
      }

      // Track analytics
      analytics.trackContentPackLoaded(contentPack.id, contentPack.version)

      return contentPack
    } catch (error) {
      errorMonitoring.reportError({
        message: 'Failed to load content pack',
        error: error instanceof Error ? error : new Error('Unknown error'),
        context: {
          component: 'content_loader',
          action: 'load',
          metadata: { fileName: file.name, fileSize: file.size },
        },
      })
      throw error
    }
  }

  /**
   * Validate content pack data
   * @param data - Content pack data to validate
   * @returns Promise resolving to validation result
   */
  async validate(data: ContentPackData): Promise<ContentValidationResult> {
    try {
      const result = await contentPackValidator.validate(data)

      return {
        valid: result.valid,
        errors: result.errors || [],
        warnings: result.warnings || [],
        metadata: result.metadata,
      }
    } catch (error) {
      return {
        valid: false,
        warnings: [],
        errors: [
          error instanceof Error ? error.message : 'Unknown validation error',
        ],
      }
    }
  }

  /**
   * Save content pack
   * @param pack - Content pack to save
   */
  async save(pack: ContentPack): Promise<void> {
    try {
      pack.updated_at = new Date().toISOString()
      await contentPackCache.set(pack.id, pack)

      analytics.trackContentPackUploaded(pack.id, pack.version, true)
    } catch (error) {
      analytics.trackContentPackUploaded(pack.id, pack.version, false)
      throw error
    }
  }

  /**
   * Get content pack by ID
   * @param id - Content pack ID
   * @returns Promise resolving to content pack or null
   */
  async get(id: string): Promise<ContentPack | null> {
    try {
      return await contentPackCache.get(id)
    } catch (error) {
      console.error('Error getting content pack:', error)
      return null
    }
  }

  /**
   * List all content packs
   * @returns Promise resolving to array of content packs
   */
  async list(): Promise<ContentPack[]> {
    try {
      // This is a simplified implementation
      // In a real app, you'd query the database
      return []
    } catch (error) {
      console.error('Error listing content packs:', error)
      return []
    }
  }

  /**
   * Delete content pack
   * @param id - Content pack ID
   */
  async delete(id: string): Promise<void> {
    try {
      await contentPackCache.invalidate(id)

      if (this.activePackId === id) {
        this.activePackId = null
      }
    } catch (error) {
      console.error('Error deleting content pack:', error)
      throw error
    }
  }

  /**
   * Backup content pack
   * @param pack - Content pack to backup
   */
  async backup(pack: ContentPack): Promise<void> {
    try {
      const backupId = `backup_${pack.id}_${Date.now()}`
      await contentPackCache.set(backupId, pack)
    } catch (error) {
      console.error('Error backing up content pack:', error)
      throw error
    }
  }

  /**
   * Restore content pack from backup
   * @param backupId - Backup ID
   * @returns Promise resolving to restored content pack or null
   */
  async restore(backupId: string): Promise<ContentPack | null> {
    try {
      return await contentPackCache.get(backupId)
    } catch (error) {
      console.error('Error restoring content pack:', error)
      return null
    }
  }

  /**
   * Search content packs
   * @param query - Search query
   * @returns Promise resolving to array of matching content packs
   */
  async search(query: string): Promise<ContentPack[]> {
    try {
      const packs = await this.list()
      const lowercaseQuery = query.toLowerCase()

      return packs.filter(
        (pack) =>
          pack.name.toLowerCase().includes(lowercaseQuery) ||
          pack.content.description.toLowerCase().includes(lowercaseQuery) ||
          pack.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
      )
    } catch (error) {
      console.error('Error searching content packs:', error)
      return []
    }
  }

  /**
   * Get active content pack
   * @returns Promise resolving to active content pack or null
   */
  async getActive(): Promise<ContentPack | null> {
    try {
      if (!this.activePackId) {
        return null
      }
      return await this.get(this.activePackId)
    } catch (error) {
      console.error('Error getting active content pack:', error)
      return null
    }
  }

  /**
   * Set active content pack
   * @param id - Content pack ID
   */
  async setActive(id: string): Promise<void> {
    try {
      const pack = await this.get(id)
      if (!pack) {
        throw new Error('Content pack not found')
      }

      // Deactivate current active pack
      if (this.activePackId) {
        const currentPack = await this.get(this.activePackId)
        if (currentPack) {
          currentPack.is_active = false
          await this.save(currentPack)
        }
      }

      // Activate new pack
      pack.is_active = true
      await this.save(pack)
      this.activePackId = id

      // Update cache
      await contentPackCache.setActive(pack)
    } catch (error) {
      console.error('Error setting active content pack:', error)
      throw error
    }
  }

  /**
   * Get content pack statistics
   * @param id - Content pack ID
   * @returns Promise resolving to statistics object
   */
  async getStatistics(id: string): Promise<Record<string, any> | null> {
    try {
      const pack = await this.get(id)
      if (!pack) {
        return null
      }

      return {
        question_count: pack.content.questions.length,
        category_count: pack.content.categories.length,
        estimated_duration: pack.content.questions.reduce(
          (total, q) => total + q.time_limit,
          0
        ),
        difficulty_distribution: pack.content.questions.reduce(
          (acc, q) => {
            acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        ),
        type_distribution: pack.content.questions.reduce(
          (acc, q) => {
            acc[q.type] = (acc[q.type] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        ),
      }
    } catch (error) {
      console.error('Error getting content pack statistics:', error)
      return null
    }
  }
}

// Export singleton instance
export const contentPackLoader = new ContentPackLoader()
