// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {MainnetKey} from "./MainnetKey.sol";
import {IReputationRegistry} from "../src/erc8004/IReputationRegistry.sol";

/// @notice Leaves on-chain ERC-8004 feedback. Caller MUST NOT be the agent owner.
contract GiveFeedback is MainnetKey {
    address internal constant REPUTATION = 0x8004B663056A597Dffe9eCcC1965A193B7388713;

    function run() external {
        string memory fb = vm.envOr("FEEDBACK_PRIVATE_KEY", string(""));
        uint256 pk = bytes(fb).length > 0 ? parseHexRaw(fb) : mainPrivateKey();
        uint256 agentId = vm.envUint("AGENT_ID");
        int128 score = int128(int256(vm.envOr("FEEDBACK_SCORE", uint256(100))));
        string memory endpoint = vm.envOr(
            "AGENT_ENDPOINT", string("http://localhost:3000/api/agent/resource")
        );

        vm.startBroadcast(pk);
        IReputationRegistry(REPUTATION).giveFeedback(
            agentId,
            score,
            0,
            "x402",
            "quality",
            endpoint,
            "",
            bytes32(0)
        );
        vm.stopBroadcast();

        address client = vm.addr(pk);
        uint64 idx = IReputationRegistry(REPUTATION).getLastIndex(agentId, client);
        console.log("agentId", agentId);
        console.log("client", client);
        console.log("index", idx);
    }
}
