import { UserRole } from "../store/corestore";

export function roleName(role: UserRole) {
  switch (role) {
    case UserRole.AUDITOR:
      return "Auditor";
    case UserRole.PAYOR:
      return "Payor";
  }
}
