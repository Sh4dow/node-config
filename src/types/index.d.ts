export interface IConfigOptions {
  object?: Record<string, unknown>;
  envSwitch: string;
  envFiles?: string[];
  envCliPrefix: string;
  env?: string;
  path?: string;
}
