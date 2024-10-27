import {
  Construct,
} from 'constructs'
import {
  Stack,
  StackProps,
} from 'aws-cdk-lib'
import {
  StaticSite,
} from './static-site'
import {
  BackEndConfig,
} from './config'

export interface BackEndProps extends StackProps, BackEndConfig {}

export class BackEndStack extends Stack {
  constructor(scope: Construct, id: string, props: BackEndProps) {
    super(scope, id, props)
    new StaticSite(this, 'StaticSite', {
      ...props.staticSite,
    })
  }
}
