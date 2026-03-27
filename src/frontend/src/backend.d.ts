import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PlayerProfile {
    age: bigint;
    theme: string;
    name: string;
    avatar: string;
}
export interface backendInterface {
    getAllProfiles(): Promise<Array<PlayerProfile>>;
    getClues(theme: string): Promise<Array<string>>;
    getPlayerStats(playerName: string): Promise<[bigint, bigint]>;
    getProfile(playerName: string): Promise<PlayerProfile>;
    saveProfile(name: string, age: bigint, avatar: string, theme: string): Promise<void>;
    submitScore(playerName: string, points: bigint): Promise<void>;
}
