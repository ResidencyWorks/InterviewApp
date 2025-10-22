export function getSessionId(): string {
	if (typeof window === "undefined") return "server";
	const key = "cross_device_session_id";
	let id = localStorage.getItem(key);
	if (!id) {
		id =
			crypto.randomUUID?.() ??
			`${Date.now()}-${Math.random().toString(36).slice(2)}`;
		localStorage.setItem(key, id);
	}
	return id;
}
