import { useState } from '#app';

export const useCompanies = () => useState<any[]>('companies', () => []);
export const useCompany = () => useState<any>('company', () => null);

export async function getCompany(id: string) {
	try {
		// const response = await GET(`/jobs/companies/${id}`);
		const response = await GET(`/jobs/companies`);

		const companies = useCompanies();
		companies.value = response ?? [];

		const company = useCompany();
		company.value = companies.value.find((comp) => comp.id == id);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function createCompany(body: any) {
	try {

		const response = await POST(`/jobs/companies`, body);

		const company = useCompany();
		company.value = response ?? null;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function editCompany(id: string, body: any) {
	try {
		const response = await PATCH(`/jobs/companies/${id}`, body);

		const company = useCompany();
		company.value = response ?? null;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function deleteCompany(id: string) {
	try {
		const response = await DELETE(`/jobs/companies/${id}`);

		const company = useCompany();
		company.value = null;

		const companies = useCompanies();
		companies.value = companies.value.filter((comp) => comp.id != id);

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getCompanies(filters: any[]) {
	try {
		let query = '';

		for (let key in filters) {
			if (typeof filters[key] == 'object' && filters[key].length > 0) {
				filters[key].forEach((item: any) => {
					query = query + `${key}=${item}&`;
				});
			} else if (typeof filters[key] == 'boolean' && filters[key] == true) {
				query = query + `${key}=${filters[key]}&`;
			} else if (
				typeof filters[key] == 'string' &&
				!!filters[key] &&
				filters[key] != '---'
			) {
				query = query + `${key}=${filters[key]}&`;
			} else if (typeof filters[key] == 'number' && filters[key] != -1) {
				query = query + `${key}=${filters[key]}&`;
			}
		}

		const response = await GET(`/jobs/companies?${query}`);

		const companies = useCompanies();
		companies.value = response ?? [];

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
