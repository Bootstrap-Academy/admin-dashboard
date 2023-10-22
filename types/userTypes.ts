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
