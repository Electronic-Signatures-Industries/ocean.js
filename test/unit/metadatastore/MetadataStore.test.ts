import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import { Ocean } from '../../../src/ocean/Ocean'
import { MetadataStore, SearchQuery } from '../../../src/metadatastore/MetadataStore'
import { DDO } from '../../../src/ddo/DDO'
import DID from '../../../src/ocean/DID'
import config from '../config'
import { LoggerInstance } from '../../../src/utils'
import { responsify, getSearchResults } from '../helpers'

use(spies)

const dataTokenMock = '0x0000000000000000000000000000000000000000'

describe('MetadataStore', () => {
  let ocean: Ocean
  let metadataStore: MetadataStore

  beforeEach(async () => {
    ocean = await Ocean.getInstance(config)
    metadataStore = ocean.metadatastore // eslint-disable-line prefer-destructuring
  })

  afterEach(() => {
    spy.restore()
  })

  describe('#queryMetadata()', () => {
    const query = {
      offset: 100,
      page: 1,
      query: {
        value: 1
      },
      sort: {
        value: 1
      },
      text: 'Office'
    } as SearchQuery

    it('should query metadata', async () => {
      spy.on(metadataStore.fetch, 'post', () => responsify(getSearchResults([new DDO()])))

      const result = await metadataStore.queryMetadata(query)
      assert.typeOf(result.results, 'array')
      assert.lengthOf(result.results, 1)
      assert.equal(result.page, 0)
      assert.equal(result.totalPages, 1)
      assert.equal(result.totalResults, 1)
    })

    it('should query metadata with a new instance', async () => {
      const metadatastoreNew = new MetadataStore(config.metadataStoreUri, LoggerInstance)
      spy.on(metadatastoreNew.fetch, 'post', () =>
        responsify(getSearchResults([new DDO()]))
      )

      const result = await metadatastoreNew.queryMetadata(query)
      assert.typeOf(result.results, 'array')
      assert.lengthOf(result.results, 1)
      assert.equal(result.page, 0)
      assert.equal(result.totalPages, 1)
      assert.equal(result.totalResults, 1)
    })

    it('should query metadata and return real ddo', async () => {
      spy.on(metadataStore.fetch, 'post', () => responsify(getSearchResults([new DDO()])))

      const result = await metadataStore.queryMetadata(query)
      assert.typeOf(result.results, 'array')
      assert.lengthOf(result.results, 1)
      assert.isDefined(result.results[0].findServiceById)
    })
  })

  describe('#storeDDO()', () => {
    it('should store a ddo', async () => {
      const did: DID = DID.generate(dataTokenMock)
      const ddo: DDO = new DDO({
        id: did.getDid()
      })

      spy.on(metadataStore.fetch, 'post', () => responsify(ddo))

      const result: DDO = await metadataStore.storeDDO(ddo)
      assert(result)
      assert(result.id === ddo.id)
    })
  })

  describe('#retrieveDDO()', () => {
    it('should store a ddo', async () => {
      const did: DID = DID.generate(dataTokenMock)
      const ddo: DDO = new DDO({
        id: did.getDid()
      })

      spy.on(metadataStore.fetch, 'post', () => responsify(ddo))
      spy.on(metadataStore.fetch, 'get', () => responsify(ddo))

      const storageResult: DDO = await metadataStore.storeDDO(ddo)
      assert(storageResult)

      assert(storageResult.id === did.getDid())

      const restrieveResult: DDO = await metadataStore.retrieveDDO(did)
      assert(restrieveResult)

      assert(restrieveResult.id === did.getDid())
      assert(restrieveResult.id === storageResult.id)
    })
  })
})
