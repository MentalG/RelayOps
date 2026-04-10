export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  OPERATOR = "OPERATOR",
}

export enum RequestStatus {
  NEW = "NEW",
  IN_REVIEW = "IN_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CONVERTED = "CONVERTED",
}

export enum JobStatus {
  PLANNED = "PLANNED",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  BLOCKED = "BLOCKED",
  DONE = "DONE",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}
