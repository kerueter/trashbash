export interface Trash {
  id: number;
  time: string;
  date?: Date;
  username: string;
  latitude: number;
  longitude: number;
  hausmuell: boolean;
  gruenabfall: boolean;
  sperrmuell: boolean;
  sondermuell: boolean;
  trashTypeString?: string;
  photo?: string;
}
