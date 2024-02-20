export interface IConfigOptions {
  object?: Record<string, unknown>;
  envSwitch: string;
  envFiles?: string[];
  env?: string;
  path?: string;
}
