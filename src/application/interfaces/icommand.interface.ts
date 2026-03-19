/**
 * Base Command Interface
 * 
 * All application commands must implement this interface to ensure
 * consistent execution flow and error handling.
 */

/**
 * Generic command interface for application layer use cases
 * 
 * @template TInput - Input DTO type (interface)
 * @template TOutput - Output DTO type (class)
 */
export interface ICommand<TInput, TOutput> {
  /**
   * Validate input parameters before execution
   * Should throw an Error if validation fails
   * 
   * @param input The input DTO to validate
   * @throws Error if input is invalid
   */
  validateInput(input: TInput): void;

  /**
   * Execute the command with the given input
   * 
   * @param input The input DTO
   * @returns Promise resolving to output DTO
   * @throws Error if execution fails
   */
  execute(input: TInput): Promise<TOutput>;
}
