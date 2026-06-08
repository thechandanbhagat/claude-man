export interface CredentialsFile {
  readonly claudeAiOauth?: {
    readonly accessToken?: string;
    readonly refreshToken?: string;
    readonly expiresAt?: number;
    readonly scopes?: readonly string[];
    readonly subscriptionType?: string;
  };
  readonly [key: string]: unknown;
}

export interface OauthAccount {
  readonly accountUuid?: string;
  readonly emailAddress?: string;
  readonly organizationName?: string;
  readonly subscriptionType?: string;
  readonly displayName?: string;
  readonly [key: string]: unknown;
}

export interface ClaudeConfigFile {
  readonly oauthAccount?: OauthAccount;
  readonly [key: string]: unknown;
}

export interface AccountIdentity {
  readonly email: string | undefined;
  readonly displayName: string | undefined;
  readonly subscriptionType: string | undefined;
  readonly accountUuid: string | undefined;
}

export interface ProfileMeta {
  readonly email: string | undefined;
  readonly subscriptionType: string | undefined;
  readonly addedAt: string;
  readonly lastUsedAt: string | undefined;
}

export interface State {
  readonly activeProfile: string | undefined;
  readonly profiles: Readonly<Record<string, ProfileMeta>>;
}

export const EMPTY_STATE: State = { activeProfile: undefined, profiles: {} };
