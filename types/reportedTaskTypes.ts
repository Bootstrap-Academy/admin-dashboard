

export class ReportBase {
    comment: string = ''
    id: string = ''
    reason: string = ''
    subtask_id: string = ''
    subtask_type: string = ''
    task_id: string = ''
    timestamp: string = ''
    // Information: user_id & name is the reporter
    user_id: string = ''
    userName: string = ''
    // Information: creator_id & name is the task-creator
    creator_id: string = ''
    creatorName: string = ''

    taskType: string = '' // MATCHING || MULTIPLE_CHOICE_QUESTION
}

export enum RESOLVE{
    REVISE = 'REVISE',
    BLOCK_REPORTER = 'BLOCK_REPORTER',
    BLOCK_CREATOR = 'BLOCK_CREATOR',
}