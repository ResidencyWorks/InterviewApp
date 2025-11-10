export type EffectiveType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

export interface NetworkState {
	effectiveType: EffectiveType;
	saveData: boolean;
	downlink: number | null; // Mbps
	rtt: number | null; // ms
}

export class NetworkManager {
	getState(): NetworkState {
		if (typeof navigator === "undefined") {
			return {
				effectiveType: "unknown",
				saveData: false,
				downlink: null,
				rtt: null,
			};
		}
		type ConnectionInfo = {
			effectiveType?: string;
			saveData?: boolean;
			downlink?: number;
			rtt?: number;
		};
		const navigatorWithConnection = navigator as Navigator & {
			connection?: ConnectionInfo;
		};
		const c = navigatorWithConnection.connection;
		return {
			effectiveType: (c?.effectiveType as EffectiveType) ?? "unknown",
			saveData: Boolean(c?.saveData),
			downlink: typeof c?.downlink === "number" ? c.downlink : null,
			rtt: typeof c?.rtt === "number" ? c.rtt : null,
		};
	}

	shouldDeferHeavyAssets(): boolean {
		const s = this.getState();
		return (
			s.saveData || s.effectiveType === "2g" || s.effectiveType === "slow-2g"
		);
	}
}

export const networkManager = new NetworkManager();
