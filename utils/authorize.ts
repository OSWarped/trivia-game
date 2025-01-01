export function authorize(userRoles: string[], requiredRole: string) {
    return userRoles.includes(requiredRole);
  }
  