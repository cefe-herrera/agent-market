// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/Script.sol";
import {USDC} from "../src/token/USDC.sol";
import {MainnetKey} from "./MainnetKey.sol";

/// @notice Mints testnet USDC to the x402 payer (facilitator EOA by default).
/// @dev env: MAIN_PRIVATE_KEY, USDC_ADDRESS, optional MINT_TO / MINT_AMOUNT
contract MintUSDC is MainnetKey {
    address internal constant PAYER_057 = 0x0571235134DC15a00f02916987C2c16b5fC52E2A;
    uint256 internal constant ONE_THOUSAND_USDC = 1_000 * 1e6;

    function run() external {
        uint256 pk = mainPrivateKey();
        address token = vm.envAddress("USDC_ADDRESS");
        address mintTo = vm.envOr("MINT_TO", PAYER_057);
        uint256 amount = vm.envOr("MINT_AMOUNT", ONE_THOUSAND_USDC);

        USDC usdc = USDC(token);

        vm.startBroadcast(pk);
        usdc.mint(mintTo, amount);
        vm.stopBroadcast();

        console.log("USDC", token);
        console.log("minted to", mintTo);
        console.log("amount", amount);
        console.log("balance", usdc.balanceOf(mintTo));
    }
}
