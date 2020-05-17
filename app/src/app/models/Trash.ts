export interface Trash {
  id: number;
  time: string;
  username: string;
  latitude: number;
  longitude: number;
  hausmuell: boolean;
  gruenabfall: boolean;
  sperrmuell: boolean;
  sondermuell: boolean;
  photo?: string;
}
