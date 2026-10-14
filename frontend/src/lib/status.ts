export const enumKey = (e: object): string => Object.keys(e)[0];

export type CampaignStatusKey = "draft" | "active" | "funded" | "milestones" | "completed" | "failed";
export type MilestoneStatusKey = "pending" | "underReview" | "approved" | "rejected";

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  funded: "Funded",
  milestones: "Milestones",
  completed: "Completed",
  failed: "Failed",
};

export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  underReview: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};
