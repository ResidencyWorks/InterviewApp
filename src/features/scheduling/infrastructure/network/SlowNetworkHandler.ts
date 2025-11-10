import { networkManager } from "./NetworkManager";

export function isSlowNetwork(): boolean {
	const s = networkManager.getState();
	return (
		s.saveData || s.effectiveType === "2g" || s.effectiveType === "slow-2g"
	);
}
