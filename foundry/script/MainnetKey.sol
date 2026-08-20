// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

abstract contract MainnetKey is Script {
    function mainPrivateKey() internal view returns (uint256) {
        return parseHexKey("MAIN_PRIVATE_KEY");
    }

    function parseHexKey(string memory envName) internal view returns (uint256) {
        return parseHexRaw(vm.envString(envName));
    }

    function parseHexRaw(string memory raw) internal view returns (uint256) {
        bytes memory b = bytes(raw);
        if (b.length >= 2 && b[0] == "0" && (b[1] == "x" || b[1] == "X")) {
            return vm.parseUint(raw);
        }
        return vm.parseUint(string.concat("0x", raw));
    }
}
