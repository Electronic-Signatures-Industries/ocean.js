import { Accounts } from './Accounts'

import { Assets } from './Assets'

// import { Compute } from './Compute'

import { Versions } from './Versions'
import { OceanUtils } from './utils/Utils'

import { MetadataStore } from '../metadatastore/MetadataStore'
import { Provider } from '../provider/Provider'
import { DataTokens } from '../datatokens/Datatokens'
import { Network } from '../datatokens/Network'
import { Config } from '../models/Config'

import {
    Instantiable,
    generateIntantiableConfigFromConfig
} from '../Instantiable.abstract'
import { Compute } from './Compute'
import { OceanPool } from '../balancer/OceanPool'
import { FixedPriceLP} from '../datatokens/FixedPriceLP'

/**
 * Main interface for Ocean Protocol.
 */
export class Ocean extends Instantiable {
    /**
     * Returns the instance of Ocean.
     * @param  {Config} config Ocean instance configuration.
     * @return {Promise<Ocean>}
     */
    public static async getInstance(config: Config): Promise<Ocean> {
        const instance = new Ocean()

        const instanceConfig = {
            ...generateIntantiableConfigFromConfig(config),
            ocean: instance
        }
        instance.setInstanceConfig(instanceConfig)

        instance.utils = await OceanUtils.getInstance(instanceConfig)

        instance.provider = new Provider(instanceConfig)
        instance.metadatastore = new MetadataStore(
            instanceConfig.config.metadataStoreUri,
            instanceConfig.logger
        )

        instance.accounts = await Accounts.getInstance(instanceConfig)
        // instance.auth = await Auth.getInstance(instanceConfig)
        instance.assets = await Assets.getInstance(instanceConfig)
        instance.compute = await Compute.getInstance(instanceConfig)
        instance.datatokens = new DataTokens(
            instanceConfig.config.factoryAddress,
            instanceConfig.config.factoryABI,
            instanceConfig.config.datatokensABI,
            instanceConfig.config.web3Provider
        )
        instance.fplp = new FixedPriceLP(
            instanceConfig.config.factoryAddress,
            instanceConfig.config.oceanTokenAddress,
            instanceConfig.config.factoryABI,
            instanceConfig.config.fplpABI,
            instanceConfig.config.web3Provider
        )
        instance.pool = new OceanPool(
            instanceConfig.config.web3Provider,
            instanceConfig.config.poolFactoryABI,
            instanceConfig.config.poolABI,
            instanceConfig.config.poolFactoryAddress,
            instanceConfig.config.oceanTokenAddress
        )
        instance.versions = await Versions.getInstance(instanceConfig)
        instance.network = new Network()
        return instance
    }

    /**
     * Network instance
     * @type {Network}
     */
    public network: Network

    /**
     * Provider instance.
     * @type {Provider}
     */
    public provider: Provider

    /**
     * Web3 provider.
     * @type {any}
     */
    public web3Provider: any

    /**
     * MetadataStore instance.
     * @type {MetadataStore}
     */
    public metadatastore: MetadataStore

    /**
     * Ocean account submodule
     * @type {Accounts}
     */
    public accounts: Accounts

    /**
     * Ocean auth submodule
     * @type {OceanAuth}
     
    public auth: OceanAuth
    */

    /**
     * Ocean assets submodule
     * @type {Assets}
     */
    public assets: Assets

    /**
     * Ocean compute submodule
     * @type {Compute}
     */
    public compute: Compute

    /**
     * Ocean DataTokens submodule
     * @type {DataTokens}
     */
    public datatokens: DataTokens

    /**
     * Ocean Pools submodule
     * @type {OceanPool}
     */
    public pool: OceanPool

    /**
     * Ocean Fixed Price Liquidity Providers
     * @type {FixedPriceLP}
     */
    public fplp: FixedPriceLP

    /**
     * Ocean tokens submodule
     * @type {OceanTokens}
     
    public tokens: OceanTokens
    */

    /**
     * Ocean versions submodule
     * @type {Versions}
     */
    public versions: Versions

    /**
     * Ocean utils submodule
     * @type {OceanUtils}
     */
    public utils: OceanUtils

    private constructor() {
        super()
    }
}
