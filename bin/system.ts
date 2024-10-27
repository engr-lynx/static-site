#!/usr/bin/env node
import 'source-map-support/register'
import {
  App,
} from 'aws-cdk-lib'
import {
  SystemConfig,
} from '../lib/config'
import {
  BackEndStack,
} from '../lib/back-end-stack'

const app = new App()
const systemContext = app.node.tryGetContext('system')
const systemConfig = systemContext as SystemConfig
const env = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
}
const name = systemConfig.name + 'BackEnd'
new BackEndStack(app, name, {
  ...systemConfig.backend,
  env,
})
