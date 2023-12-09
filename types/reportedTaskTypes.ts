

export class ReportBase {
    comment: string = ''
    id: string = ''
    reason: string = ''
    subtask_id: string = ''
    subtask_type: TASK_TYPE = TASK_TYPE.MULTIPLE_CHOICE_QUESTION
    task_id: string = ''
    timestamp: string = ''
    // Information: user_id & name is the reporter
    user_id: string = ''
    userName: string = ''
    // Information: creator_id & name is the task-creator
    creator_id: string = ''
    creatorName: string = ''
}

export enum REASON {
    ABUSE = 'ABUSE',
    DISLIKE = 'DISLIKE',
    OTHER = 'OTHER',
    UNRELATED_SKILL = 'UNRELATED_SKILL',
    WRONG = 'WRONG',
}

export enum RESOLVE{
    REVISE = 'REVISE',
    BLOCK_REPORTER = 'BLOCK_REPORTER',
    BLOCK_CREATOR = 'BLOCK_CREATOR',
}

export enum TASK_TYPE {
	MATCHING = "MATCHING",
	MULTIPLE_CHOICE_QUESTION = "MULTIPLE_CHOICE_QUESTION",
	QUESTION = "QUESTION",
	CODING_CHALLENGE = "CODING_CHALLENGE",
}

export class MatchingWithSolution{
    id: string = ''
    task_id: string = ''
    type: TASK_TYPE.MATCHING = TASK_TYPE.MATCHING
    creator: string = ''
    creation_timestamp: string = ''
    xp: number = 0
    coins: number = 0
    solved: boolean = false
    rated: boolean = false
    enabled: boolean = false
    retired: boolean = false
    left: string[] = []
    right: string[] = []
    solution: number[] = []
}