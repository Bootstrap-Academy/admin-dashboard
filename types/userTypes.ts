export class User {
  id: string = '';
  username: string = '';
  display_name: string = '';
  email: string = '';
  email_verified: boolean = false;
  registration: number = 0;
  last_login: number = 0;
  last_name_change: number = 0;
  enabled: boolean = false;
  admin: boolean = false;
  password: string = '';
  mfa_enabled: boolean = false;
  description: string = '';
  tags: string[] = [];
  newsletter: boolean = false;
}

export class UserFilter {
  email?: string | undefined = undefined;
  enabled?: boolean = false;
  admin?: boolean = false;
  mfa_enabled?: boolean = false;
  email_verified?: boolean = false;
  newsletter?: boolean = false;
}

export class UserSearchRequestBody {
  limit: number = 10;
  offset: number = 0;
  name: string | undefined = undefined;
  email: string | undefined = undefined;
  enabled: boolean | undefined = undefined;
  admin: boolean | undefined = undefined;
  mfa_enabled: boolean | undefined = undefined;
  email_verified: boolean | undefined = undefined;
  newsletter: boolean | undefined = undefined;
}

export class UserSearchResponse {
  total: number = 0;
  users: User[] = [];
}

export enum USERSORT{
    NONE = 'none',
    ENABLED = 'user',
    DISABLED = 'disabled',
    ADMIN = 'admin',
    NOTADMIN = 'notadmin',
    MFA = 'mfa',
    NOMFA = 'nomfa',
    EMAILVERIFIED = 'emailverified',
    NOTEMAILVERIFIED = 'notemailverified',
    NEWSLETTER = 'newsletter',
    NOTNEWSLETTER = 'notnewsletter',
}