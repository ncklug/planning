/** @jsx jsx */
import { jsx } from '@emotion/core'
import { useEffect, useRef, useState } from 'react'

import styled from '@emotion/styled'
import { ResponsiveBar } from '@nivo/bar'
import Head from 'next/head'
import { Settings, X } from 'react-feather'
import createPersistedState from 'use-persisted-state'

function isNumeric(str: string) {
  if (typeof str != 'string') return false // we only process strings!
  return (
    !isNaN(str as any) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ) // ...and ensure strings of whitespace fail
}

type ConfigItem = {
  name: string
  expectedHours: number
  currentHours: number
}

type Config = Array<ConfigItem>

const Button = styled.button({})

const Input = styled.input({
  fontSize: 14,
  lineHeight: '22px',
  borderWidth: 1,
  borderStyle: 'solid',
  padding: '1px 4px',
  borderRadius: 3,
})

type AddConfigItem = () => void
type SetConfigItem = (index: number, props: Partial<ConfigItem>) => void
type DeleteConfigItem = (index: number) => void
type ClearConfig = () => void

const usePersistedConfig = createPersistedState('config')
const useConfig = () => {
  const [config, setConfig] = usePersistedConfig(undefined)
  const addConfigItem: AddConfigItem = () => {
    setConfig(prevConfig => [
      ...prevConfig,
      { name: '', expectedHours: 0, currentHours: 0 },
    ])
  }
  const deleteConfigItem: DeleteConfigItem = index => {
    setConfig(prevConfig => [
      ...prevConfig.slice(0, index),
      ...prevConfig.slice(index + 1),
    ])
  }
  const setConfigItem: SetConfigItem = (index, partialConfigItem) => {
    setConfig(prevConfig => [
      ...prevConfig.slice(0, index),
      { ...prevConfig[index], ...partialConfigItem },
      ...prevConfig.slice(index + 1),
    ])
  }
  const clearConfig: ClearConfig = () => {
    setConfig(prevConfig => [])
  }
  return { config, addConfigItem, deleteConfigItem, clearConfig, setConfigItem }
}

const NAME_COL_STYLE = {
  display: 'inline-block',
  borderWidth: 1,
  padding: '1px 4px',
  width: 150,
}
const HOURS_COL_STYLE = {
  display: 'inline-block',
  borderWidth: 1,
  marginLeft: 6,
  padding: '1px 4px',
  width: 48,
}

type ConfigurerProps = {
  config: Config
  addConfigItem: AddConfigItem
  deleteConfigItem: DeleteConfigItem
  setConfigItem: SetConfigItem
  clearConfig: ClearConfig
  showGraph: () => void
}
const Configurer: React.FC<ConfigurerProps> = ({
  config,
  addConfigItem,
  deleteConfigItem,
  setConfigItem,
  clearConfig,
  showGraph,
}) => {
  return (
    <div>
      <h2>Configure your activities</h2>
      <div>
        <span css={NAME_COL_STYLE}>Activity</span>
        <span css={HOURS_COL_STYLE}>Planned Hours</span>
        <span css={HOURS_COL_STYLE}>Current Hours</span>
      </div>

      {config.map(({ currentHours, name, expectedHours }, i) => (
        <div css={{ marginTop: 4 }} key={i}>
          <Input
            css={NAME_COL_STYLE}
            value={name}
            onChange={e => setConfigItem(i, { name: e.target.value })}
          />
          <Input
            css={HOURS_COL_STYLE}
            value={expectedHours}
            onChange={e =>
              isNumeric(e.target.value) &&
              setConfigItem(i, { expectedHours: Number(e.target.value) })
            }
          />
          <Input
            css={HOURS_COL_STYLE}
            value={currentHours}
            onChange={e =>
              isNumeric(e.target.value) &&
              setConfigItem(i, { currentHours: Number(e.target.value) })
            }
          />
          <X
            css={{ marginLeft: 4, verticalAlign: 'middle' }}
            onClick={() => deleteConfigItem(i)}
            size={14}
          />
        </div>
      ))}
      <div css={{ marginTop: 16 }}>
        <Button onClick={addConfigItem}>Add Activity</Button>
        <Button css={{ marginLeft: 12 }} onClick={clearConfig}>
          Clear All
        </Button>
      </div>
      {config.length > 0 && (
        <div css={{ marginTop: 16 }}>
          <Button onClick={showGraph}>Show Graph</Button>
        </div>
      )}
    </div>
  )
}

type GraphProps = {
  config: Config
  showConfig: () => void
}
const Graph: React.FC<GraphProps> = ({ config, showConfig }) => {
  return (
    <div>
      <span css={{ float: 'right' }}>
        <Settings onClick={showConfig} size={16} />
      </span>
      <div
        css={{
          maxHeight: config.length * 60 + 100,
          width: 'calc(100% - 75px)',
          height: 'calc(100vh - 125px)',
        }}
      >
        <ResponsiveBar
          data={config.map(item => ({
            ...item,
            remainingHours: item.expectedHours - item.currentHours,
          }))}
          indexBy="name"
          layout="horizontal"
          reverse={true}
          keys={['remainingHours', 'currentHours']}
          margin={{ top: 20, right: 0, bottom: 50, left: 80 }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Activities',
            legendPosition: 'middle',
            legendOffset: -70,
          }}
        />
      </div>
    </div>
  )
}

const TimeTracker: React.FC<{ isServer: boolean }> = ({ isServer }) => {
  const {
    config,
    addConfigItem,
    deleteConfigItem,
    clearConfig,
    setConfigItem,
  } = useConfig()
  const [isConfiguring, setIsConfiguring] = useState(false)
  const isInitialRender = useRef(true)

  useEffect(() => {
    if (!isInitialRender.current) {
      return
    }
    isInitialRender.current = false
    if (config == null) {
      clearConfig()
    } else {
      setIsConfiguring(config.length === 0)
    }
  })

  return (
    <div css={{ border: '1px solid black', padding: 16 }}>
      {isServer || config === undefined ? (
        <div css={{ height: 'calc(100vh - 120px)' }}></div>
      ) : isConfiguring ? (
        <Configurer
          config={config}
          addConfigItem={addConfigItem}
          clearConfig={clearConfig}
          deleteConfigItem={deleteConfigItem}
          setConfigItem={setConfigItem}
          showGraph={() => setIsConfiguring(false)}
        />
      ) : (
        <Graph config={config} showConfig={() => setIsConfiguring(true)} />
      )}
    </div>
  )
}

const Main = ({ isServer }) => (
  <div>
    <Head>
      <title>Planning</title>
      {/* <link rel="icon" href="/favicon.ico" /> */}
    </Head>

    <main css={{ margin: 20 }}>
      <h1>Time planning</h1>
      <TimeTracker isServer={isServer} />
    </main>
  </div>
)

export default Main
