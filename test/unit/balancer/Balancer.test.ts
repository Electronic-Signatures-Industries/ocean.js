import { assert } from 'chai'
import { TestContractHandler } from '../../TestContractHandler'
import { BalancerContractHandler } from '../../BalancerContractHandler'
import { DataTokens } from '../../../src/datatokens/Datatokens'
// import { Balancer } from '../../../src/balancer/balancerlib'
import { OceanPool } from '../../../src/balancer/OceanPool'
import { Ocean } from '../../../src/ocean/Ocean'
import { Config } from '../../../src/models/Config'

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const factory = require('@oceanprotocol/contracts/artifacts/development/DTFactory.json')
const datatokensTemplate = require('@oceanprotocol/contracts/artifacts/development/DataTokenTemplate.json')

// this will be replaced by our SFactory/SPool
const SFactory = require('@oceanprotocol/contracts/artifacts/development/SFactory.json')
const SPool = require('@oceanprotocol/contracts/artifacts/development/SPool.json')

const OceanPoolFactory = require('../../../src/balancer/artifacts/BFactory.json')
const OceanPoolPool = require('../../../src/balancer/artifacts/BPool.json')

describe('Balancer flow', () => {
    let oceanTokenAddress
    let OceanPoolFactoryAddress
    let Pool
    let OceanPoolContracts
    let oceandatatoken
    let alicePool
    let alicePoolAddress
    let bobPool
    let currentDtPrice
    let bobPoolShares
    let owner
    let bob
    let alice
    let contracts
    let datatoken
    let tokenAddress
    let transactionId
    const tokenAmount = web3.utils.toWei('1000')
    const transferAmount = web3.utils.toWei('200')
    const blob = 'http://localhost:8030/api/v1/services/consume'
    describe('#test', () => {
        it('Initialize Ocean contracts v3', async () => {
            contracts = new TestContractHandler(
                factory.abi,
                datatokensTemplate.abi,
                datatokensTemplate.bytecode,
                factory.bytecode,
                web3
            )
            await contracts.getAccounts()
            owner = contracts.accounts[0]
            alice = contracts.accounts[1]
            bob = contracts.accounts[2]
            await contracts.deployContracts(owner)
        })
        it('should initialize datatokens class', async () => {
            datatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )
            assert(datatoken !== null)
        })

        it('should create datatokens smart contract', async () => {
            tokenAddress = await datatoken.create(blob, alice)
            assert(tokenAddress !== null)
        })
        it('Create a dummy OceanToken', async () => {
            // Alice creates a Datatoken
            oceandatatoken = new DataTokens(
                contracts.factoryAddress,
                factory.abi,
                datatokensTemplate.abi,
                web3
            )
            oceanTokenAddress = await oceandatatoken.create(blob, alice)
        })
        it('Deploy OceanPool Factory', async () => {
            OceanPoolContracts = new BalancerContractHandler(
                OceanPoolFactory.abi,
                OceanPoolFactory.bytecode,
                OceanPoolPool.abi,
                OceanPoolPool.bytecode,
                web3
            )
            await OceanPoolContracts.getAccounts()
            owner = OceanPoolContracts.accounts[0]
            console.log('Owner:' + owner)
            await OceanPoolContracts.deployContracts(owner)
            OceanPoolFactoryAddress = OceanPoolContracts.factoryAddress
            assert(OceanPoolFactoryAddress !== null)
        })


        it('Deploy SFactory', async () => {
            const SContracts = new BalancerContractHandler(
                SFactory.abi,
                SFactory.bytecode,
                SPool.abi,
                SPool.bytecode,
                web3
            )
            await SContracts.getAccounts()
            owner = SContracts.accounts[0]
            console.log('Owner:' + owner)
            await SContracts.SdeployContracts(owner)
            const SFactoryAddress = SContracts.factoryAddress
            assert(SFactoryAddress !== null)
        })


        it('should initialize OceanPool class', async () => {
            Pool = new OceanPool(
                web3,
                alice,
                OceanPoolFactory.abi,
                OceanPoolPool.abi,
                OceanPoolFactoryAddress,
                oceanTokenAddress
            )
            assert(Pool !== null)
        })

        it('Alice mints 1000 tokens', async () => {
            await datatoken.mint(tokenAddress, alice, tokenAmount)
        })
        it('Alice mints 1000 Ocean tokens', async () => {
            await oceandatatoken.mint(oceanTokenAddress, alice, tokenAmount)
        })
        it('Alice transfers 200 ocean token to Bob', async () => {
            const ts = await datatoken.transfer(
                oceanTokenAddress,
                bob,
                transferAmount,
                alice
            )
            transactionId = ts.transactionHash
        })
        it('Alice creates a new OceanPool pool', async () => {
            /// new pool with total DT = 45 , dt weight=90% with swap fee 2%
            alicePoolAddress = await Pool.createDTPool(tokenAddress, 45, 9, '0.02')
            alicePool = await Pool.loadDTPool(alicePoolAddress)
            assert(alicePool !== null)
        })
        it('Get pool information', async () => {
            const currentTokens = await alicePool.getCurrentTokens()
            assert(currentTokens.length === 2)
            assert(currentTokens.includes(tokenAddress))
            assert(currentTokens.includes(oceanTokenAddress))
        })
        it('Get pool swap fee', async () => {
            const currentSwapFee = await alicePool.getSwapFee()
            assert(currentSwapFee === '0.02')
        })
        it('Get dtPrice from the pool ', async () => {
            currentDtPrice = await alicePool.getDTPrice()
            assert(currentDtPrice > 0)
        })
        it('Get dtToken pool reserve ', async () => {
            const currentDtReserve = await alicePool.getBalance(tokenAddress)
            assert(currentDtReserve > 0)
        })
        it('Get dtToken pool reserve ', async () => {
            const currentOceanReserve = await alicePool.getOceanBalance()
            assert(currentOceanReserve > 0)
        })
        it("Bob should load Alice's pool ", async () => {
            bobPool = new OceanPool(
                web3,
                bob,
                OceanPoolFactory.abi,
                OceanPoolPool.abi,
                OceanPoolFactoryAddress,
                oceanTokenAddress
            )
            await bobPool.loadDTPool(alicePoolAddress)
        })
        it('Bob should buy a DT ', async () => {
            const maxPrice = parseFloat(currentDtPrice) * 2
            await bobPool.buyDT('1', '2', String(maxPrice))
            const bobDtBalance = await datatoken.balance(tokenAddress, bob)
            const bobOceanBalance = await datatoken.balance(oceanTokenAddress, bob)
            assert(bobDtBalance > 0)
            assert(bobOceanBalance > 0)
        })
        it('Bob should add DT liquidity to pool ', async () => {
            const currentDtReserve = await alicePool.getBalance(tokenAddress)
            const bobDtBalance = web3.utils.fromWei(
                await datatoken.balance(tokenAddress, bob)
            )

            await bobPool.addDTLiquidity(bobDtBalance)

            const newbobDtBalance = web3.utils.fromWei(
                await datatoken.balance(tokenAddress, bob)
            )

            const newDtReserve = await alicePool.getBalance(tokenAddress)

            const sharesBalance = await bobPool.sharesBalance(bob)
            assert(parseFloat(newbobDtBalance) < parseFloat(bobDtBalance))
            assert(parseFloat(newDtReserve) > parseFloat(currentDtReserve))
            assert(parseFloat(sharesBalance) > 0)
        })

        it('Bob should remove DT liquidity from pool ', async () => {
            const currentDtReserve = await alicePool.getBalance(tokenAddress)
            const bobDtBalance = web3.utils.fromWei(
                await datatoken.balance(tokenAddress, bob)
            )
            const poolShares = await bobPool.sharesBalance(bob)
            await bobPool.removeDTLiquidity('0.75', poolShares)

            const newDtReserve = await alicePool.getBalance(tokenAddress)
            const newbobDtBalance = web3.utils.fromWei(
                await datatoken.balance(tokenAddress, bob)
            )
            const newpoolShares = await bobPool.sharesBalance(bob)
            assert(parseFloat(newDtReserve) < parseFloat(currentDtReserve))
            assert(parseFloat(bobDtBalance) < parseFloat(newbobDtBalance))
            assert(parseFloat(poolShares) > parseFloat(newpoolShares))
        })

        it('Bob should add Ocean liquidity to pool ', async () => {
            const currentDtReserve = await alicePool.getBalance(oceanTokenAddress)
            const bobDtBalance = web3.utils.fromWei(
                await datatoken.balance(oceanTokenAddress, bob)
            )

            await bobPool.addOceanLiquidity('1')

            const newbobDtBalance = web3.utils.fromWei(
                await datatoken.balance(oceanTokenAddress, bob)
            )

            const newDtReserve = await alicePool.getBalance(oceanTokenAddress)

            const sharesBalance = await bobPool.sharesBalance(bob)
            assert(parseFloat(newbobDtBalance) < parseFloat(bobDtBalance))
            assert(parseFloat(newDtReserve) > parseFloat(currentDtReserve))
            assert(parseFloat(sharesBalance) > 0)
        })

        it('Bob should remove Ocean liquidity from pool ', async () => {
            const currentDtReserve = await alicePool.getBalance(oceanTokenAddress)
            const bobDtBalance = web3.utils.fromWei(
                await datatoken.balance(oceanTokenAddress, bob)
            )
            const poolShares = await bobPool.sharesBalance(bob)
            await bobPool.removeOceanLiquidity('0.75', poolShares)

            const newDtReserve = await alicePool.getBalance(oceanTokenAddress)
            const newbobDtBalance = web3.utils.fromWei(
                await datatoken.balance(oceanTokenAddress, bob)
            )
            const newpoolShares = await bobPool.sharesBalance(bob)
            assert(parseFloat(newDtReserve) < parseFloat(currentDtReserve))
            assert(parseFloat(bobDtBalance) < parseFloat(newbobDtBalance))
            assert(parseFloat(poolShares) > parseFloat(newpoolShares))
        })
    })
})
