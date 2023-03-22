import { useState } from '#app';
import { Ref } from 'vue';
import { GET, PATCH, DELETE, PUT } from './fetch';

export const useAppUsers = () => useState('appUsers', () => []);
export const useTotalAppUsers = () => useState('totalAppUsers', () => 0);
export const useAppUser = () => useState('appUser', () => null);
export const useOffset = () => useState('offset', () => 0);
export const useLimit = () => useState('limit', () => 10);
export const useQuery = () => useState('query', () => '');

export async function getAppUsers(filters: any) {
	try {
		let newQuery = '';

		for (let key in filters) {
			if (typeof filters[key] == 'object' && filters[key].length > 0) {
				filters[key].forEach((item: any) => {
					newQuery = newQuery + `${key}=${item}&`;
				});
			} else if (typeof filters[key] == 'boolean' && filters[key] == true) {
				newQuery = newQuery + `${key}=${filters[key]}&`;
			} else if (
				typeof filters[key] == 'string' &&
				!!filters[key].trim() &&
				filters[key] != '---'
			) {
				newQuery = newQuery + `${key}=${filters[key].trim()}&`;
			} else if (typeof filters[key] == 'number' && filters[key] != -1) {
				newQuery = newQuery + `${key}=${filters[key]}&`;
			}
		}

		const query = useQuery();
		const offset = useOffset();
		const limit = useLimit();

		if (newQuery != query.value) {
			offset.value = 0;
			console.log('query not same');
		}

		const response = await GET(
			`/auth/users?offset=${offset.value}&limit=${limit.value}&${newQuery}`
		);

		const appUsers: Ref<any[]> = useAppUsers();
		const totalAppUsers = useTotalAppUsers();

		let arr: any[] = response?.users ?? [];

		if (newQuery == query.value) {
			arr = [...appUsers.value, ...arr];
			console.log('query is same');
			// arr = [...new Set(arr)];
		}

		appUsers.value = arr;

		totalAppUsers.value = response?.total ?? 0;
		query.value = newQuery;

		console.log('offset', offset.value);
		console.log('current', arr.length);
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
						email_verified: response?.email_verified ?? user.email_verified,
				  }
				: user;
		});

		appUsers.value = [...mappedUsers];

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
