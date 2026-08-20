// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {USDC} from "../src/token/USDC.sol";
import {MainnetKey} from "./MainnetKey.sol";

/// @notice Deploys mock Circle-style USDC. Uses `MAIN_PRIVATE_KEY` from `.env`.
contract DeployUSDC is MainnetKey {
    function run() external {
        uint256 pk = mainPrivateKey();

        vm.startBroadcast(pk);
        USDC usdc = new USDC();
        vm.stopBroadcast();

        console.log("USDC", address(usdc));
        console.log("owner", usdc.owner());
    }
}
