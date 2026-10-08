import type { ReactNode } from "react"
import type { ManagementAccess, ManagementReason } from "@/domain/interfaces/league"
import BillingPaywall from "./BillingPaywall"
import BillingReadOnlyState from "./BillingReadOnlyState"
import { managementSurface } from "../management-access"

interface Props {
  access?: ManagementAccess
  reason?: ManagementReason
  resourceName: string
  onViewPublic?: () => void
  children: ReactNode
}

export default function ManagementAccessGate({ access, reason, resourceName, onViewPublic, children }: Props) {
  // Missing fields mean an older backend or enforcement disabled; preserve the legacy screen.
  const surface = managementSurface(access)
  if (surface === "MANAGE") return children
  if (surface === "READ_ONLY") {
    return <BillingReadOnlyState resourceName={resourceName} reason={reason} onViewPublic={onViewPublic} />
  }
  return <BillingPaywall resourceName={resourceName} reason={reason} />
}
