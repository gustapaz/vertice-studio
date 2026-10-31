export type Params = {
  folds: number;
  torsion: number;
  tension: number;
  finish: "chrome" | "copper" | "ceramic";
};
export type Preset = {
  id: string;
  title: string;
  subtitle: string;
  params: Params;
};
export type Stats = {
  vertices: number;
  triangles: number;
  area: number;
  volume: number;
  bounds: { min: number[]; max: number[] };
  unit: string;
  closed: boolean;
};
export type Geometry = {
  params: Params;
  positions: number[];
  indices: number[];
  stats: Stats;
};
export type Piece = {
  id: string;
  title: string;
  params: Params;
  revision: number;
  published: boolean;
  created_at: number;
  updated_at: number;
  expires_at: number;
};
export type Credential = { id: string; token: string; title: string };
