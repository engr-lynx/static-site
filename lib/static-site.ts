import {
  join,
} from 'path'
import {
  readFileSync,
} from 'fs'
import {
  Construct,
} from 'constructs'
import {
  load,
} from "js-yaml"
import {
  RemovalPolicy,
  Duration,
  CustomResource,
  CfnOutput,
  aws_route53 as Route53,
  aws_certificatemanager as ACM,
  aws_s3 as S3,
  aws_cloudfront as CloudFront,
  aws_iam as IAM,
  aws_lambda as Lambda,
  custom_resources as Resources,
  aws_route53_targets as Targets,
} from 'aws-cdk-lib'
import {
  CloudFrontToS3,
} from '@aws-solutions-constructs/aws-cloudfront-s3'
import {
  StaticSiteConfig,
  ServiceConfig,
  ElementConfig,
} from './config'

export interface StaticSiteProps extends StaticSiteConfig {}

export class StaticSite extends Construct {

  public readonly distribution: CloudFront.Distribution;
  public readonly storage: S3.Bucket;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id)
    let domainName
    if (props.isSubdomain ?? false) {
      const firstDotIndex = props.domain.indexOf('.')
      domainName = props.domain.substring(firstDotIndex + 1)
    } else {
      domainName = props.domain
    }
    const zone = Route53.HostedZone.fromLookup(this, 'Zone', {
      domainName,
    })
    const validation = ACM.CertificateValidation.fromDns(zone)
    const certificate = new ACM.Certificate(this, 'Certificate', {
      domainName: props.domain,
      validation,
    })
    const bucketProps = {
      bucketName: props.bucket,
      removalPolicy: RemovalPolicy.DESTROY,
    }
    const viewerRequestFilePath = join(__dirname, 'cf-functions', 'viewer-request-handler.js')
    const viewerRequestCode = CloudFront.FunctionCode.fromFile({
      filePath: viewerRequestFilePath,
    })
    const viewerRequestFunction = new CloudFront.Function(this, 'ViewerRequestFunction', {
      code: viewerRequestCode,
      runtime: CloudFront.FunctionRuntime.JS_2_0,
    })
    const viewerRequestAssociation = {
      eventType: CloudFront.FunctionEventType.VIEWER_REQUEST,
      function: viewerRequestFunction,
    }
    const servicesFilePath = 'services.yaml'
    const servicesFile = readFileSync(servicesFilePath, 'utf8')
    const services = load(servicesFile) as ServiceConfig[]
    const elements = props.cspHeaderServices?.reduce<ElementConfig[]>((elements, serviceName) => {
      const found = services.find(service => service.name == serviceName)
      return elements.concat(found?.elements ?? [])
    }, [])
    const viewerResponseFilePath = join(__dirname, 'cf-functions', 'viewer-response-handler.js')
    let viewerResponseFile = readFileSync(viewerResponseFilePath, 'utf8')
    const sourceTypes = [
      'objectSrc',
      'frameSrc',
      'mediaSrc',
      'imgSrc',
      'styleSrc',
      'fontSrc',
      'scriptSrc',
      'prefetchSrc',
      'connectSrc',
    ]
   sourceTypes.forEach(currentSourceType => {
      const elementsOfSourceType = elements?.filter(element => element.name == currentSourceType)
      const sourcesOfSourceType = elementsOfSourceType?.reduce<string[]>((sources, element) => {
        return sources.concat(element.sources)
      }, [])
      if (sourcesOfSourceType) {
        const uniqueSources = sourcesOfSourceType.filter((val, ndx, arr) => arr.indexOf(val) === ndx)
        const sources = uniqueSources.join(' ')
        viewerResponseFile = viewerResponseFile.replace('{{' + currentSourceType + '}}', sources)
      }
    })
    const viewerResponseCode = CloudFront.FunctionCode.fromInline(viewerResponseFile)
    const viewerResponseFunction = new CloudFront.Function(this, 'ViewerResponseFunction', {
      code: viewerResponseCode,
      runtime: CloudFront.FunctionRuntime.JS_2_0,
    })
    const viewerResponseAssociation = {
      eventType: CloudFront.FunctionEventType.VIEWER_RESPONSE,
      function: viewerResponseFunction,
    }
    const functionAssociations = [
      viewerRequestAssociation,
      viewerResponseAssociation,
    ]
    const defaultBehavior = {
      responseHeadersPolicy: CloudFront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_AND_SECURITY_HEADERS,
      functionAssociations,
    }
    const domainNames = [
      props.domain,
    ]
    const cloudFrontDistributionProps = {
      defaultBehavior,
      domainNames,
      certificate,
      enableLogging: false,
    }
    const site = new CloudFrontToS3(this, 'Site', {
      bucketProps,
      cloudFrontDistributionProps,
      insertHttpSecurityHeaders: false,
      logS3AccessLogs: false,
    })
    this.distribution = site.cloudFrontWebDistribution
    this.storage = site.s3Bucket!
    // <-- ToDo: Once origin shield is in cloudFrontDistributionProps, we can replace this with setting it there.
    const cfnDistribution = this.distribution.node.defaultChild as CloudFront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginShield', {
      Enabled: true,
      OriginShieldRegion: this.distribution.env.region,
    })
    // -->
    if (props.iamUser) {
      const deployer = IAM.User.fromUserName(this, 'Deployer', props.iamUser)
      this.storage.grantReadWrite(deployer)
    }
    const codePath = join(__dirname, 'custom-resources', 'empty-bucket')
    const code = Lambda.Code.fromAsset(codePath)
    const onEventHandler = new Lambda.Function(this, 'EmptyBucketFunction', {
      code,
      handler: 'index.handler',
      runtime: Lambda.Runtime.PYTHON_3_12,
      architecture: Lambda.Architecture.ARM_64,
      memorySize: 192,
      timeout: Duration.minutes(5),
    })
    this.storage.grantRead(onEventHandler)
    this.storage.grantDelete(onEventHandler)
    const emptyBucketProvider = new Resources.Provider(this, 'EmptyBucketProvider', {
      onEventHandler,
    })
    const properties = {
      bucketName: this.storage.bucketName,
    }
    new CustomResource(this, 'EmptyBucketResource', {
      serviceToken: emptyBucketProvider.serviceToken,
      properties,
    })
    const aliasTarget = new Targets.CloudFrontTarget(this.distribution)
    const target = Route53.RecordTarget.fromAlias(aliasTarget)
    new Route53.ARecord(this, 'ARecord', {
      zone,
      target,
      recordName: props.domain,
    })
    new CfnOutput(this, 'Storage', {
      value: this.storage.bucketName,
    })

  }

}
