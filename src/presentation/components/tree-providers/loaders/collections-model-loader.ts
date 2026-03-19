/**
 * Collections Model Loader
 * 
 * Loads collection models from persistence layer.
 * Returns plain objects (no VS Code dependencies).
 */

/**
 * Plain collection model for reusability
 */
export interface CollectionModel {
  id: string;
  name: string;
  description?: string;
  items?: CollectionModel[];
  itemCount: number;
}

/**
 * Collections model loader interface
 */
export interface ICollectionsModelLoader {
  loadCollections(): Promise<CollectionModel[]>;
  loadChildren(parent?: CollectionModel): Promise<CollectionModel[]>;
}

/**
 * Collection service interface
 */
export interface ICollectionService {
  getAllCollections(): Promise<any[]>;
  getCollectionChildren(id: string): Promise<any[]>;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Loads collection models
 */
export class CollectionsModelLoader implements ICollectionsModelLoader {
  constructor(
    private service: ICollectionService,
    private logger: ILogger
  ) {}

  async loadCollections(): Promise<CollectionModel[]> {
    try {
      this.logger.debug('[CollectionsModelLoader] Loading collections');
      const collections = await this.service.getAllCollections();
      return collections.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        itemCount: c.items?.length || 0
      }));
    } catch (error) {
      this.logger.error('[CollectionsModelLoader] Failed to load collections', error);
      throw error;
    }
  }

  async loadChildren(parent?: CollectionModel): Promise<CollectionModel[]> {
    if (!parent) {
      return this.loadCollections();
    }

    try {
      this.logger.debug('[CollectionsModelLoader] Loading children', { parentId: parent.id });
      const children = await this.service.getCollectionChildren(parent.id);
      return children.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        itemCount: c.items?.length || 0
      }));
    } catch (error) {
      this.logger.error('[CollectionsModelLoader] Failed to load children', error);
      throw error;
    }
  }
}
