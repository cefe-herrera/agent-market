import {
  encodeValidationData,
  getAccount,
  getEnableSessionsAction,
  getOwnableValidatorMockSignature,
  getPermissionId,
  getRemoveSessionAction,
  getSmartSessionsValidator,
  getSudoPolicy,
  getTimeFramePolicy,
  OWNABLE_VALIDATOR_ADDRESS,
  SMART_SESSIONS_ADDRESS,
  SmartSessionMode,
  encodeSmartSessionSignature,
  encodeValidatorNonce,
  type Session,
} from "@rhinestone/module-sdk";
import {
  toBytes,
  toFunctionSelector,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import { AGENT_SAFE_SALT_NONCE } from "./addresses";
import {
  createSafe7579Client,
  waitUserOpTx,
  type SafeOwner,
} from "./safe7579";

const SUBMIT_SELECTOR = toFunctionSelector(
  "submit(uint256,bytes32,bytes)",
);

const SESSION_SALT = toHex(toBytes("8183-submit", { size: 32 }));

export function commerceSubmitSession(opts: {
  sessionOwner: Address;
  chainId?: number;
  permitPaymaster?: boolean;
}): Session {
  const cfg = getErc8183(opts.chainId);
  const now = Math.floor(Date.now() / 1000);
  const userOpPolicies = cfg.isMainnet
    ? [
        getTimeFramePolicy({
          validAfter: now,
          validUntil: now + 7 * 24 * 60 * 60,
        }),
      ]
    : [getSudoPolicy()];

  return {
    sessionValidator: OWNABLE_VALIDATOR_ADDRESS,
    sessionValidatorInitData: encodeValidationData({
      threshold: 1,
      owners: [opts.sessionOwner],
    }),
    salt: SESSION_SALT,
    userOpPolicies,
    erc7739Policies: {
      allowedERC7739Content: [],
      erc1271Policies: [],
    },
    actions: [
      {
        actionTarget: cfg.commerce,
        actionTargetSelector: SUBMIT_SELECTOR,
        actionPolicies: [getSudoPolicy()],
      },
    ],
    chainId: BigInt(cfg.chainId),
    permitERC4337Paymaster: opts.permitPaymaster ?? false,
  };
}

export function smartSessionsModule(session: Session) {
  return getSmartSessionsValidator({ sessions: [session] });
}

export function submitSessionPermissionId(session: Session): Hex {
  return getPermissionId({ session });
}

/**
 * Owner-signed: deploy Agent Safe if needed, install Smart Sessions,
 * enable submit-only session for `sessionOwner`.
 */
export async function grantAgentSubmitSession(opts: {
  owner: SafeOwner;
  sessionOwner: Address;
  chainId?: number;
  agentSafe?: Address;
}): Promise<{
  agentSafe: Address;
  permissionId: Hex;
  installed: boolean;
  hashes: Hex[];
}> {
  const { client, address, account } = await createSafe7579Client({
    owner: opts.owner,
    chainId: opts.chainId,
    saltNonce: AGENT_SAFE_SALT_NONCE,
    address: opts.agentSafe,
  });
  const session = commerceSubmitSession({
    sessionOwner: opts.sessionOwner,
    chainId: opts.chainId,
    permitPaymaster: false,
  });
  const module = smartSessionsModule(session);
  const hashes: Hex[] = [];

  const deployed = await account.isDeployed();
  let installed = false;
  if (deployed) {
    installed = await client.isModuleInstalled({
      address: SMART_SESSIONS_ADDRESS,
      type: "validator",
      context: "0x",
    });
  }

  if (!installed) {
    const hash = await client.installModule({
      address: module.address,
      type: "validator",
      context: module.initData,
    });
    hashes.push(await waitUserOpTx(hash, opts.chainId));
    return {
      agentSafe: address,
      permissionId: submitSessionPermissionId(session),
      installed: true,
      hashes,
    };
  }

  const enable = getEnableSessionsAction({ sessions: [session] });
  const hash = await client.sendUserOperation({
    calls: [
      {
        to: enable.to,
        data: enable.callData,
        value: BigInt(0),
      },
    ],
  });
  hashes.push(await waitUserOpTx(hash, opts.chainId));
  return {
    agentSafe: address,
    permissionId: submitSessionPermissionId(session),
    installed: true,
    hashes,
  };
}

export async function revokeAgentSubmitSession(opts: {
  owner: SafeOwner;
  sessionOwner: Address;
  chainId?: number;
  agentSafe?: Address;
}): Promise<{ agentSafe: Address; hash: Hex }> {
  const { client, address } = await createSafe7579Client({
    owner: opts.owner,
    chainId: opts.chainId,
    saltNonce: AGENT_SAFE_SALT_NONCE,
    address: opts.agentSafe,
  });
  const session = commerceSubmitSession({
    sessionOwner: opts.sessionOwner,
    chainId: opts.chainId,
  });
  const remove = getRemoveSessionAction({
    permissionId: submitSessionPermissionId(session),
  });
  const userOpHash = await client.sendUserOperation({
    calls: [{ to: remove.to, data: remove.callData, value: BigInt(0) }],
  });
  return {
    agentSafe: address,
    hash: await waitUserOpTx(userOpHash, opts.chainId),
  };
}

export function sessionValidatorNonce(agentSafe: Address): bigint {
  return encodeValidatorNonce({
    account: getAccount({ address: agentSafe, type: "safe" }),
    validator: getSmartSessionsValidator({}),
  });
}

export function encodeUseSessionSignature(opts: {
  session: Session;
  signature: Hex;
}): Hex {
  return encodeSmartSessionSignature({
    mode: SmartSessionMode.USE,
    permissionId: getPermissionId({ session: opts.session }),
    signature: opts.signature,
  });
}

export function sessionMockSignature(): Hex {
  return getOwnableValidatorMockSignature({ threshold: 1 });
}

export { SMART_SESSIONS_ADDRESS, SmartSessionMode };
