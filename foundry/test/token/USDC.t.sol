// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {USDC} from "../../src/token/USDC.sol";

contract USDCTest is Test {
    USDC internal usdc;

    uint256 internal payerPk;
    address internal payer;
    address internal payTo;
    address internal relayer;

    bytes32 internal constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    function setUp() public {
        usdc = new USDC();
        payerPk = 0xA11CE;
        payer = vm.addr(payerPk);
        payTo = makeAddr("payTo");
        relayer = makeAddr("relayer");

        usdc.mint(payer, 1_000_000e6);
    }

    function test_Metadata() public view {
        assertEq(usdc.name(), "USDC");
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.decimals(), 6);
        assertEq(usdc.version(), "2");
    }

    function test_CircleTypehashes() public view {
        assertEq(
            usdc.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
            bytes32(0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267)
        );
        assertEq(
            usdc.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(),
            bytes32(0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8)
        );
        assertEq(
            usdc.CANCEL_AUTHORIZATION_TYPEHASH(),
            bytes32(0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429)
        );
    }

    function test_TransferWithAuthorization_VRS() public {
        uint256 value = 1000;
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 3600;
        bytes32 nonce = keccak256("nonce-1");

        (uint8 v, bytes32 r, bytes32 s) =
            _signTransfer(payerPk, payer, payTo, value, validAfter, validBefore, nonce);

        vm.prank(relayer);
        usdc.transferWithAuthorization(payer, payTo, value, validAfter, validBefore, nonce, v, r, s);

        assertEq(usdc.balanceOf(payTo), value);
        assertEq(usdc.balanceOf(payer), 1_000_000e6 - value);
        assertTrue(usdc.authorizationState(payer, nonce));
    }

    function test_TransferWithAuthorization_PackedBytes() public {
        uint256 value = 1000;
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 3600;
        bytes32 nonce = keccak256("nonce-bytes");

        (uint8 v, bytes32 r, bytes32 s) =
            _signTransfer(payerPk, payer, payTo, value, validAfter, validBefore, nonce);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        usdc.transferWithAuthorization(payer, payTo, value, validAfter, validBefore, nonce, signature);

        assertEq(usdc.balanceOf(payTo), value);
        assertTrue(usdc.authorizationState(payer, nonce));
    }

    function test_ReplayProtection() public {
        uint256 value = 1000;
        uint256 validBefore = block.timestamp + 3600;
        bytes32 nonce = keccak256("nonce-replay");
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(payerPk, payer, payTo, value, 0, validBefore, nonce);

        usdc.transferWithAuthorization(payer, payTo, value, 0, validBefore, nonce, v, r, s);
        vm.expectRevert("FiatTokenV2: authorization is used or canceled");
        usdc.transferWithAuthorization(payer, payTo, value, 0, validBefore, nonce, v, r, s);
    }

    function test_ExpiredAuthorization() public {
        uint256 value = 1000;
        bytes32 nonce = keccak256("nonce-expired");
        (uint8 v, bytes32 r, bytes32 s) = _signTransfer(payerPk, payer, payTo, value, 0, 1, nonce);

        vm.warp(2);
        vm.expectRevert("FiatTokenV2: authorization is expired");
        usdc.transferWithAuthorization(payer, payTo, value, 0, 1, nonce, v, r, s);
    }

    function test_ReceiveWithAuthorization_OnlyPayTo() public {
        uint256 value = 1000;
        uint256 validBefore = block.timestamp + 3600;
        bytes32 nonce = keccak256("nonce-receive");
        (uint8 v, bytes32 r, bytes32 s) = _signReceive(payerPk, payer, payTo, value, 0, validBefore, nonce);

        vm.prank(relayer);
        vm.expectRevert("FiatTokenV2: caller must be the payee");
        usdc.receiveWithAuthorization(payer, payTo, value, 0, validBefore, nonce, v, r, s);

        vm.prank(payTo);
        usdc.receiveWithAuthorization(payer, payTo, value, 0, validBefore, nonce, v, r, s);
        assertEq(usdc.balanceOf(payTo), value);
    }

    function test_DomainSeparatorMatchesFrontend() public view {
        bytes32 expected = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("USDC")),
                keccak256(bytes("2")),
                block.chainid,
                address(usdc)
            )
        );
        assertEq(usdc.DOMAIN_SEPARATOR(), expected);
    }

    function _signTransfer(
        uint256 pk,
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                usdc.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));
        return vm.sign(pk, digest);
    }

    function _signReceive(
        uint256 pk,
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                usdc.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(),
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));
        return vm.sign(pk, digest);
    }
}
