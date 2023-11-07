import type { Ref } from 'vue';

export const useRootSkills = () => useState('rootSkills', () => null);
export const useRootSkill = () => useState('rootSkill', () => null);

export const useSubSkills = () => useState('subSkills', () => null);
export const useSubSkill = () => useState('subSkill', () => null);

export const useSkillTree = () => useState('skillTree', () => null);

export async function getRootSkills() {
	try {
		const response = await GET(`/skills/skilltree`);

		const rootSkills = useRootSkills();
		rootSkills.value = response ?? null;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getRootSkill(id: string) {
	try {
		const response = await GET(`/skills/skilltree/${id}`);

		const rootSkills = useRootSkills();
		rootSkills.value = response ?? null;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getSubSkills(rootSkillID: string) {
	try {
		if (!!!rootSkillID) {
			throw { data: 'Invalid root skill id' };
		}

		const response = await GET(`/skills/skilltree/${rootSkillID}`);

		const subSkills = useSubSkills();
		subSkills.value = response ?? null;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function getSkillTreeByRootID(rootSkillID: string) {
	try {
		if (!!!rootSkillID) {
			throw { data: 'Invalid root skill id' };
		}

		const url =
			rootSkillID == 'root'
				? `/skills/skilltree`
				: `/skills/skilltree/${rootSkillID}`;

		const response = await GET(url);

		const skillTree = useSkillTree();
		skillTree.value = response ?? null;

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function createNewSkill(rootSkillID: string, body: any) {
	const isRoot = rootSkillID == 'root';
	try {
		if (!!!rootSkillID) {
			throw { data: 'Invalid root skill id' };
		}

		if (isRoot) {
			delete body.courses;
			body.sub_tree_rows = 25;
			body.sub_tree_columns = 25;
		}

		const url =
			rootSkillID == 'root'
				? `/skills/skilltree`
				: `/skills/skilltree/${rootSkillID}`;

		const response = await POST(url, body);

		const skillTree: Ref<any> = useSkillTree();
		let skills: any[] = skillTree.value?.skills ?? [];
		skills.push(response);
		skillTree.value.skills = [...skills];

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function updateSkill(
	rootSkillID: string,
	subSkillID: string,
	body: any
) {
	const isRoot = rootSkillID == 'root';
	try {
		if (!!!rootSkillID) {
			throw { data: 'Invalid root skill id' };
		}

		if (isRoot && !!!subSkillID) {
			throw { data: 'Invalid sub skill id' };
		}

		if (isRoot) {
			delete body.courses;
		}

		delete body.id;

		const url =
			rootSkillID == 'root'
				? `/skills/skilltree/${subSkillID}`
				: `/skills/skilltree/${rootSkillID}/${subSkillID}`;

		const response = await PATCH(url, body);

		const skillTree: Ref<any> = useSkillTree();
		let skills: any[] = skillTree.value?.skills ?? [];
		let updatedArr = skills.map((skill: any) => {
			return skill.id == subSkillID ? { ...response } : { ...skill };
		});

		skillTree.value.skills = [...updatedArr];
		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function deleteSkill(rootSkillID: string, subSkillID: string) {
	const isRoot = rootSkillID == 'root';
	try {
		if (!!!rootSkillID) {
			throw { data: 'Invalid root skill id' };
		}

		if (isRoot && !!!subSkillID) {
			throw { data: 'Invalid sub skill id' };
		}

		const url =
			rootSkillID == 'root'
				? `/skills/skilltree/${subSkillID}`
				: `/skills/skilltree/${rootSkillID}/${subSkillID}`;

		const response = await DELETE(url);

		const skillTree: Ref<any> = useSkillTree();
		let skills: any[] = skillTree.value?.skills ?? [];
		let updatedArr = skills.filter((skill: any) => skill.id != subSkillID);

		skillTree.value.skills = [...updatedArr];
		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function updateTreeSettings(rootSkillID: string, body: any) {
	const isRoot = rootSkillID == 'root';
	try {
		if (!!!rootSkillID) {
			throw { data: 'Invalid root skill id' };
		}

		let response = null;

		if (isRoot) {
			response = await PATCH(`/skills/skilltree`, body);
		} else {
			response = await PATCH(`/skills/skilltree/${rootSkillID}`, <any>{
				sub_tree_rows: body.rows,
				sub_tree_columns: body.columns,
			});
		}

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}
