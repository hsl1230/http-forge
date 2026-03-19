/**
 * Application Layer - Data Transfer Objects (DTOs)
 * 
 * Central export point for all DTOs used in the application layer.
 * Each DTO module handles data transfer between layers following the DDD pattern.
 * 
 * - Input DTOs: Interfaces that define input contracts
 * - Output DTOs: Classes that structure output responses
 * 
 * DTOs are layer boundaries - they ensure that inner layers don't
 * depend on presentation layer structures and vice versa.
 */

// Request Execution
export {
    ExecuteRequestInput,
    ExecuteRequestOutput
} from './request.dto';

// History Management
export {
    UseHistoryEntryInput,
    UseHistoryEntryOutput
} from './history.dto';

// Cookie Management
export {
    ManageCookieInput,
    ManageCookieOutput
} from './cookie.dto';

// Variable Management
export {
    ManageVariableInput,
    ManageVariableOutput
} from './variable.dto';

// Environment Selection
export {
    SelectEnvironmentInput,
    SelectEnvironmentOutput
} from './environment.dto';

// Environment CRUD Operations
export {
    AddEnvironmentInput,
    AddEnvironmentOutput,
    DeleteEnvironmentInput,
    DeleteEnvironmentOutput,
    DuplicateEnvironmentInput,
    DuplicateEnvironmentOutput
} from './environment-crud.dto';

// Collection Management
export {
    SaveCollectionInput,
    SaveCollectionOutput,
    UpdateCollectionInput,
    UpdateCollectionOutput
} from './collection.dto';

// Test Suite Management
export {
    BrowseDataInput,
    BrowseDataOutput,
    ExportSuiteInput,
    ExportSuiteOutput, RunSuiteInput,
    RunSuiteOutput, SaveSuiteInput,
    SaveSuiteOutput
} from './test-suite.dto';

// Folder Management
export {
    SaveFolderInput,
    SaveFolderOutput
} from './folder.dto';

// Schema Management
export {
    ManageSchemaInput,
    ManageSchemaOutput
} from './schema.dto';

// OAuth2 Management
export {
    ManageOAuth2Input,
    ManageOAuth2Output
} from './oauth2.dto';

// GraphQL Management
export {
    ManageGraphQLInput,
    ManageGraphQLOutput
} from './graphql.dto';

