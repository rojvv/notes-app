export interface Note {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  title: string;
  additionalText: string;
}
