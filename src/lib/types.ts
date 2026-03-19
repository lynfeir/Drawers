export interface Drawer {
  openWidth: string;
  openDepth: string;
  height: number;
  qty: number;
}

export interface DrawerCalc {
  cutW: number;
  cutD: number;
  botW: number;
  botD: number;
  height: number;
  qty: number;
}

export interface CutList {
  id: string;
  name: string;
  drawers: Drawer[];
}

export interface Job {
  id: string;
  name: string;
  lists: CutList[];
  _open: boolean;
}

export interface AppData {
  jobs: Job[];
}

export interface BoardPiece {
  len: number;
  label: string;
}

export interface Board {
  pieces: BoardPiece[];
  remaining: number;
}

export interface CutPiece {
  len: number;
  label: string;
  count: number;
}
