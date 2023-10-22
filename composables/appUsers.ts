import { useState } from '#app';
import { Ref } from 'vue';
import { GET, PATCH, DELETE, PUT } from './fetch';
import { UserFilter } from '@/types/userTypes';

export const useAppUsers = () => useState('appUsers', () => []);
export const useTotalAppUsers = () => useState('totalAppUsers', () => 0);
export const useAppUser = () => useState('appUser', () => null);
export const useOffset = () => useState('offset', () => 0);
export const useLimit = () => useState('limit', () => 10);
export const useQuery = () => useState('query', () => '');
export const useBanUsers = () => useState('banUsers', () => []);

export async function getAppUsers(filters: UserFilter) {
    try {
        let newQuery = '';

        for (let key in filters) {
            const value = (filters as any)[key];
            if (typeof value === 'object' && value && value.length > 0) {
                (value as string[]).forEach((item: string) => {
                    newQuery = newQuery + `${key}=${item}&`;
                });
            } else if (typeof value === 'boolean' && value === true) {
                newQuery = newQuery + `${key}=${value}&`;
            } else if (
                typeof value === 'string' &&
                !!value.trim() &&
                value !== '---'
            ) {
                newQuery = newQuery + `${key}=${value.trim()}&`;
            } else if (typeof value === 'number' && value !== -1) {
                newQuery = newQuery + `${key}=${value}&`;
            }
        }

        if (newQuery.endsWith('&')) {
            newQuery = newQuery.slice(0, -1);
        }

        const query = useQuery();
        const offset = useOffset();
        const limit = useLimit();

        if (newQuery != query.value) {
            offset.value = 0;
        }

        const response = await GET(
            `/auth/users?offset=${offset.value}&limit=${limit.value}&${newQuery}`
        );

        const appUsers: Ref<any[]> = useAppUsers();
        const totalAppUsers = useTotalAppUsers();

        let arr: any[] = response?.users ?? [];

        appUsers.value = arr

        const banUsers: any = useBanUsers();

        if (!banUsers.value.length) {
            await getBanUsers();
        }

        if (banUsers.value.length) {
            appUsers.value.forEach((user: any) => {
                const bannedUser = banUsers.value.find(
                    (banned: any) => banned.user_id === user.id
                );
                if (bannedUser) {
                    if (bannedUser.action.toLowerCase().includes('report')) {
                        user.reportBan = true;
                        user.reportBan_id = bannedUser.id;
                    } else user.reportBan = false;
                    if (bannedUser.action.toLowerCase().includes('create')) {
                        user.createBan = true;
                        user.createSubtaskBan_id = bannedUser.id;
                    } else user.createBan = false;
                } else {
                    user.reportBan = false;
                    user.createBan = false;
                }
            });
        }

        totalAppUsers.value = response?.total ?? 0;
        query.value = newQuery;

        console.log('offset', offset.value);
        console.log('current', appUsers.value.length);
        console.log('total', totalAppUsers.value);
        console.log('------------------------------------------------');

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function getAppUser(id: string) {
    try {
        if (!!!id) {
            throw { data: 'Invalid App User Id' };
        }
        const response = await GET(`/auth/users/${id}`);

        const appUser = useAppUser();
        appUser.value = response ?? null;

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function setBanStatusOfAppUser(status: boolean, id: string) {
    try {
        if (!!!id) {
            throw { data: 'Invalid App User Id' };
        }

        const response = await PATCH(`/auth/users/${id}`, <any>{
            enabled: status,
        });

        const appUser: Ref<any> = useAppUser();
        appUser.value = response ?? null;

        const appUsers: Ref<any[]> = useAppUsers();
        let indexOfDeletedUser = appUsers.value.findIndex(
            (user: any) => user.id == id
        );

        if (indexOfDeletedUser >= 0) {
            appUsers.value.splice(indexOfDeletedUser, 1, {
                ...appUsers.value[indexOfDeletedUser],
                enabled: appUser.value?.enabled ?? false,
            });
        }

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}
export async function getBanUsers() {
    try {
        const banUsers = useBanUsers();
        const res = await GET(`/challenges/bans`);
        banUsers.value = res ?? [];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function deleteAppUser(id: string) {
    try {
        if (!!!id) {
            throw { data: 'Invalid App User Id' };
        }

        const response = await DELETE(`/auth/users/${id}`);

        const appUsers = useAppUsers();
        let indexOfDeletedUser = appUsers.value.findIndex(
            (user: any) => user.id == id
        );

        if (indexOfDeletedUser >= 0) {
            appUsers.value.splice(indexOfDeletedUser, 1);
        }

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function getBalanceOfThisUser(id: string) {
    try {
        if (!!!id) {
            throw { data: { detail: 'Missing user id' } };
        }

        const response = await GET(`/shop/coins/${id}`);

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function setBalanceOfThisUser(id: string, body: any) {
    try {
        if (!!!id) {
            throw { data: { detail: 'Missing user id' } };
        }

        const response = await POST(`/shop/coins/${id}`, body);

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function getXPOfThisUser(id: string) {
    try {
        if (!!!id) {
            throw { data: { detail: 'Missing user id' } };
        }

        const response = await GET(`/skills/xp/${id}`);

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function setXPOfThisUser(
    id: string,
    rootSkill: string,
    subSkill: string,
    xp: any
) {
    try {
        if (!!!id) {
            throw { data: { detail: 'Missing user id' } };
        }
        if (!!!rootSkill) {
            throw { data: { detail: 'Missing root Skill' } };
        }
        if (!!!subSkill) {
            throw { data: { detail: 'Missing sub Skill' } };
        }

        let body: any = {
            xp: xp,
        };

        const response = await PATCH(
            `/skills/xp/${id}/${rootSkill}/${subSkill}`,
            body
        );

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function setEmailVerificationOfThisUser(
    id: string,
    status: boolean
) {
    try {
        if (!!!id) {
            throw { data: { detail: 'Missing user id' } };
        }
        const response = await PATCH(`/auth/users/${id}`, <any>{
            email_verified: status,
        });

        const appUser: Ref<any> = useAppUser();
        appUser.value = response ?? null;

        const appUsers: Ref<any[]> = useAppUsers();

        let mappedUsers = appUsers.value.map((user) => {
            return user.id == id
                ? {
                      ...user,
                      email_verified:
                          response?.email_verified ?? user.email_verified,
                  }
                : user;
        });

        appUsers.value = [...mappedUsers];

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function banAppUser(body: any) {
    try {
        const res = await POST(`/challenges/bans`, { ...body, reason: '' });
        return [res, null];
    } catch (error: any) {
        return [null, error];
    }
}

export async function unbanAppUser(id: any) {
    try {
        const res = await DELETE(`/challenges/bans/${id}`);
        return [res, null];
    } catch (error: any) {
        return [null, error];
    }
}
