export function resolvePublicAppVersion(env: Record<string, string | undefined>): string {
	const version = env.PUBLIC_APP_VERSION?.trim();
	return version ? version : '0.0.0';
}
