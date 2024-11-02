/*
export interface CSPHeaderConfig {
  readonly objectSrcs?: [string]
  readonly frameSrcs?: [string]
  readonly mediaSrcs?: [string]
  readonly imgSrcs?: [string]
  readonly styleSrcs?: [string]
  readonly fontSrcs?: [string]
  readonly scriptSrcs?: [string]
  readonly prefetchSrcs?: [string]
  readonly connectSrcs?: [string]
}
*/

export interface StaticSiteConfig {
  readonly domain: string
  readonly isSubdomain?: boolean
  readonly zoneId: string
  readonly bucket?: string
  readonly iamUser?: string
  readonly cspHeaderServices?: [string]
}

export interface BackEndConfig {
  readonly staticSite: StaticSiteConfig
}

export interface AppConfig {
  readonly name: string
  readonly backend: BackEndConfig
}

export interface ElementConfig {
  readonly name: string
  readonly sources: [string]
}

export interface ServiceConfig {
  readonly name: string
  readonly elements: [ElementConfig]
}
