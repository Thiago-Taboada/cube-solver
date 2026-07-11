interface Min2PhaseApi {
  solve(facelet: string): string;
  initFull(): void;
  randomCube(): string;
  fromScramble(scramble: string): string;
}

declare const min2phase: Min2PhaseApi;
export default min2phase;
