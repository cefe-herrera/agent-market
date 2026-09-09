import type { Address, Hex } from "viem";

export enum JobStatus {
  OPEN = 0,
  FUNDED = 1,
  SUBMITTED = 2,
  COMPLETED = 3,
  REJECTED = 4,
  EXPIRED = 5,
}

export enum Verdict {
  PENDING = 0,
  APPROVE = 1,
  REJECT = 2,
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  [JobStatus.OPEN]: "OPEN",
  [JobStatus.FUNDED]: "FUNDED",
  [JobStatus.SUBMITTED]: "SUBMITTED",
  [JobStatus.COMPLETED]: "COMPLETED",
  [JobStatus.REJECTED]: "REJECTED",
  [JobStatus.EXPIRED]: "EXPIRED",
};

export type Job = {
  id: bigint;
  client: Address;
  provider: Address;
  evaluator: Address;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: JobStatus;
  hook: Address;
  submittedAt: bigint;
  deliverable: Hex;
};

export type JobWriteResult = {
  hash: Hex;
  jobId?: bigint;
};

export type CreateAndFundStep =
  | "checking"
  | "creating"
  | "registering"
  | "budget"
  | "approving"
  | "funding"
  | "done";
