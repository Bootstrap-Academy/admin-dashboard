export class Quiz {
  coins: number = 0;
  creation_timestamp: string = "";
  creator: string = "";
  enabled: boolean = false;
  id: string = "";
  question: string = "";
  rated: boolean = false;
  retired: boolean = false;
  single_choice: boolean = false;
  solved: boolean = false;
  task_id: string = "";
  type: string = ""; // ? 'MULTIPLE_CHOICE_QUESTION
  xp: number = 0;
  answers: string[] = [];
}
