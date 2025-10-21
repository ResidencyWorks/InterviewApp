"use client";

import { LogOut, Settings, User } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks";

interface UserMenuProps {
	className?: string;
}

/**
 * User menu component with profile and logout options
 */
export function UserMenu({ className }: UserMenuProps) {
	const { user, signOut } = useAuth();
	const [loading, setLoading] = useState(false);

	if (!user) {
		return null;
	}

	const handleSignOut = async () => {
		setLoading(true);
		try {
			await signOut();
		} catch (error) {
			console.error("Sign out error:", error);
		} finally {
			setLoading(false);
		}
	};

	const getInitials = (email: string) => {
		return email
			.split("@")[0]
			.split(".")
			.map((part) => part[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const getEntitlementBadge = (entitlement: string) => {
		switch (entitlement) {
			case "PRO":
				return "bg-green-100 text-green-800";
			case "TRIAL":
				return "bg-yellow-100 text-yellow-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className={`relative h-8 w-8 rounded-full ${className}`}
				>
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={user.user_metadata?.avatar_url}
							alt={user.email}
						/>
						<AvatarFallback>{getInitials(user.email || "")}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">
							{user.user_metadata?.full_name || user.email}
						</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user.email}
						</p>
						{user.user_metadata?.entitlement_level && (
							<span
								className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium w-fit ${getEntitlementBadge(user.user_metadata.entitlement_level)}`}
							>
								{user.user_metadata.entitlement_level}
							</span>
						)}
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<User className="mr-2 h-4 w-4" />
					<span>Profile</span>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Settings className="mr-2 h-4 w-4" />
					<span>Settings</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut} disabled={loading}>
					<LogOut className="mr-2 h-4 w-4" />
					<span>{loading ? "Signing out..." : "Sign out"}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
