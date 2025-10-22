import type { NextRequest } from "next/server";

export interface IAuthUser {
	id: string;
	email?: string;
}

export function getUserFromRequest(request: NextRequest): IAuthUser | null {
	const auth = request.headers.get("authorization");
	if (!auth || !auth.startsWith("Bearer ")) return null;
	const token = auth.slice("Bearer ".length);
	// For M0, accept any non-empty token and derive a stable user id
	return { id: `user_${Buffer.from(token).toString("base64url")}` };
}
