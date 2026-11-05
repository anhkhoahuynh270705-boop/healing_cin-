export interface UserTask {
  id: string;
  title: string;
  description: string;
  rewardExp: number;
  eligible: boolean;
  claimed: boolean;
}

export interface TaskProgress {
  experiencePoints: number;
  level: number;
  levelExperience: number;
  nextLevelExperience: number;
  tasks: UserTask[];
}
